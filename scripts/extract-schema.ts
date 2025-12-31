import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!.replace('https://', '').replace('/', '');
const projectRef = supabaseUrl.split('.')[0];
const dbPassword = process.env.SUPABASE_DB_PASSWORD!;

async function extractSchema() {
  const client = new Client({
    host: 'aws-0-us-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: `postgres.${projectRef}`,
    password: dbPassword,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase database');

    // Get all tables in public schema
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);
    console.log(`Found ${tablesResult.rows.length} tables`);

    // Create sql/tables directory
    const sqlDir = path.join(process.cwd(), 'sql', 'tables');
    if (!fs.existsSync(sqlDir)) {
      fs.mkdirSync(sqlDir, { recursive: true });
    }

    // Extract DDL for each table
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      console.log(`Extracting schema for table: ${tableName}`);

      // Get table columns
      const columnsQuery = `
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          column_default,
          is_nullable,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `;

      const columnsResult = await client.query(columnsQuery, [tableName]);

      // Get primary key
      const pkQuery = `
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary;
      `;

      const pkResult = await client.query(pkQuery, [`public.${tableName}`]);
      const primaryKeys = pkResult.rows.map(r => r.attname);

      // Get foreign keys
      const fkQuery = `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1;
      `;

      const fkResult = await client.query(fkQuery, [tableName]);

      // Get triggers for this table
      const triggersQuery = `
        SELECT
          t.tgname AS trigger_name,
          pg_get_triggerdef(t.oid) AS trigger_definition,
          p.proname AS function_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE c.relname = $1
          AND t.tgisinternal = false;
      `;

      const triggersResult = await client.query(triggersQuery, [tableName]);

      // Get RLS policies for this table
      const rlsQuery = `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = $1
        ORDER BY policyname;
      `;

      const rlsResult = await client.query(rlsQuery, [tableName]);

      // Check if RLS is enabled on the table
      const rlsEnabledQuery = `
        SELECT relrowsecurity
        FROM pg_class
        WHERE oid = $1::regclass;
      `;

      const rlsEnabledResult = await client.query(rlsEnabledQuery, [`public.${tableName}`]);
      const rlsEnabled = rlsEnabledResult.rows[0]?.relrowsecurity || false;

      // Build CREATE TABLE statement
      let ddl = `-- Table: ${tableName}\n`;
      ddl += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;

      const columnDefs = columnsResult.rows.map(col => {
        let def = `    ${col.column_name} `;

        // Map data type
        if (col.data_type === 'USER-DEFINED') {
          def += col.udt_name;
        } else if (col.data_type === 'character varying') {
          def += `VARCHAR${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`;
        } else {
          def += col.data_type.toUpperCase();
        }

        // Default value
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }

        // Nullable
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }

        return def;
      });

      ddl += columnDefs.join(',\n');

      // Add primary key constraint
      if (primaryKeys.length > 0) {
        ddl += `,\n    PRIMARY KEY (${primaryKeys.join(', ')})`;
      }

      ddl += '\n);\n';

      // Add foreign key constraints
      if (fkResult.rows.length > 0) {
        ddl += '\n';
        fkResult.rows.forEach(fk => {
          ddl += `ALTER TABLE public.${tableName}\n`;
          ddl += `    ADD FOREIGN KEY (${fk.column_name})\n`;
          ddl += `    REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name});\n`;
        });
      }

      // Add triggers and their functions
      if (triggersResult.rows.length > 0) {
        ddl += '\n-- Triggers\n';

        // Get unique function names
        const functionNames = [...new Set(triggersResult.rows.map(t => t.function_name))];

        // Get function definitions
        for (const funcName of functionNames) {
          const funcQuery = `
            SELECT pg_get_functiondef(p.oid) AS function_definition
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = $1 AND n.nspname = 'public';
          `;

          const funcResult = await client.query(funcQuery, [funcName]);
          if (funcResult.rows.length > 0) {
            ddl += `\n${funcResult.rows[0].function_definition};\n`;
          }
        }

        // Add trigger definitions
        triggersResult.rows.forEach(trigger => {
          ddl += `\n${trigger.trigger_definition};\n`;
        });
      }

      // Get indexes for this table
      const indexesQuery = `
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = $1
          AND indexname NOT LIKE '%_pkey'  -- Exclude primary key indexes
        ORDER BY indexname;
      `;

      const indexesResult = await client.query(indexesQuery, [tableName]);

      // Add indexes
      if (indexesResult.rows.length > 0) {
        ddl += '\n-- Indexes\n';
        indexesResult.rows.forEach(index => {
          ddl += `\n${index.indexdef};\n`;
        });
      }

      // Add RLS policies
      if (rlsEnabled || rlsResult.rows.length > 0) {
        ddl += '\n-- Row Level Security\n';

        if (rlsEnabled) {
          ddl += `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n`;
        }

        if (rlsResult.rows.length > 0) {
          rlsResult.rows.forEach(policy => {
            ddl += `\nCREATE POLICY ${policy.policyname}\n`;
            ddl += `    ON public.${tableName}\n`;
            ddl += `    AS ${policy.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE'}\n`;
            ddl += `    FOR ${policy.cmd}\n`;

            // Handle roles - could be array or string
            const roles = Array.isArray(policy.roles) ? policy.roles.join(', ') : policy.roles;
            ddl += `    TO ${roles}\n`;

            if (policy.qual) {
              ddl += `    USING (${policy.qual})\n`;
            }

            if (policy.with_check) {
              ddl += `    WITH CHECK (${policy.with_check})\n`;
            }

            ddl += ';\n';
          });
        }
      }

      // Write to file
      const filePath = path.join(sqlDir, `${tableName}.sql`);
      fs.writeFileSync(filePath, ddl);
      console.log(`  ✓ Written to ${filePath}`);
    }

    console.log('\n✓ Table extraction complete!');
    console.log(`Files saved to: ${sqlDir}`);

    // Extract Views
    console.log('\nExtracting views...');

    const viewsQuery = `
      SELECT table_name as view_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const viewsResult = await client.query(viewsQuery);
    console.log(`Found ${viewsResult.rows.length} views`);

    // Create sql/views directory
    const viewsDir = path.join(process.cwd(), 'sql', 'views');
    if (!fs.existsSync(viewsDir)) {
      fs.mkdirSync(viewsDir, { recursive: true });
    }

    for (const row of viewsResult.rows) {
      const viewName = row.view_name;
      console.log(`Extracting view: ${viewName}`);

      // Get view definition
      const viewDefQuery = `
        SELECT pg_get_viewdef($1::regclass, true) as definition;
      `;

      const viewDefResult = await client.query(viewDefQuery, [`public.${viewName}`]);

      if (viewDefResult.rows.length > 0) {
        let viewDDL = `-- View: ${viewName}\n`;
        viewDDL += `CREATE OR REPLACE VIEW public.${viewName} AS\n`;
        viewDDL += viewDefResult.rows[0].definition;

        // If definition doesn't end with semicolon, add it
        if (!viewDDL.trim().endsWith(';')) {
          viewDDL += ';';
        }
        viewDDL += '\n';

        // Write to file
        const viewFilePath = path.join(viewsDir, `${viewName}.sql`);
        fs.writeFileSync(viewFilePath, viewDDL);
        console.log(`  ✓ Written to ${viewFilePath}`);
      }
    }

    console.log('\n✓ All extractions complete!');
    console.log(`Tables saved to: ${sqlDir}`);
    console.log(`Views saved to: ${viewsDir}`);

    // Extract Cron Jobs
    console.log('\nExtracting cron jobs...');

    const cronJobsQuery = `
      SELECT
        jobid,
        schedule,
        command,
        nodename,
        nodeport,
        database,
        username,
        active,
        jobname
      FROM cron.job
      ORDER BY jobid;
    `;

    try {
      const cronJobsResult = await client.query(cronJobsQuery);
      console.log(`Found ${cronJobsResult.rows.length} cron jobs`);

      if (cronJobsResult.rows.length > 0) {
        // Create sql/cron directory
        const cronDir = path.join(process.cwd(), 'sql', 'cron');
        if (!fs.existsSync(cronDir)) {
          fs.mkdirSync(cronDir, { recursive: true });
        }

        let cronDDL = '-- Cron Jobs\n';
        cronDDL += '-- Note: These jobs use pg_cron extension\n';
        cronDDL += '-- Make sure pg_cron is enabled: CREATE EXTENSION IF NOT EXISTS pg_cron;\n\n';

        cronJobsResult.rows.forEach(job => {
          cronDDL += `-- Job ID: ${job.jobid}\n`;
          cronDDL += `-- Job Name: ${job.jobname || 'unnamed'}\n`;
          cronDDL += `-- Active: ${job.active}\n`;
          cronDDL += `SELECT cron.schedule(\n`;
          cronDDL += `    '${job.jobname || `job_${job.jobid}`}',\n`;
          cronDDL += `    '${job.schedule}',\n`;
          cronDDL += `    $$${job.command}$$\n`;
          cronDDL += `);\n\n`;

          if (!job.active) {
            cronDDL += `-- This job is currently disabled\n`;
            cronDDL += `-- To disable: SELECT cron.alter_job(${job.jobid}, active := false);\n\n`;
          }

          cronDDL += `-- To unschedule: SELECT cron.unschedule('${job.jobname || `job_${job.jobid}`}');\n`;
          cronDDL += `---\n\n`;
        });

        // Write to file
        const cronFilePath = path.join(cronDir, 'cron_jobs.sql');
        fs.writeFileSync(cronFilePath, cronDDL);
        console.log(`  ✓ Written to ${cronFilePath}`);
        console.log(`\nCron jobs saved to: ${cronDir}`);
      } else {
        console.log('  No cron jobs found');
      }
    } catch (cronError: any) {
      console.log('  ⚠ Could not extract cron jobs (pg_cron may not be enabled)');
      console.log(`  Error: ${cronError.message}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

extractSchema();

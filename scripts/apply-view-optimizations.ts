/**
 * Script to apply database view optimizations
 * Run with: npx ts-node scripts/apply-view-optimizations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyView(viewName: string, filePath: string) {
    console.log(`\n📝 Applying view: ${viewName}...`);

    try {
        // Read SQL file
        const sql = fs.readFileSync(filePath, 'utf-8');

        // Execute SQL
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            // If exec_sql RPC doesn't exist, try direct execution
            // This might not work depending on your Supabase setup
            console.log('   ⚠️  exec_sql RPC not found, trying direct execution...');

            // We'll need to use the postgres client directly
            // For now, just output the SQL
            console.log('   ℹ️  Please run this SQL manually in your Supabase SQL Editor:');
            console.log('   ' + '='.repeat(60));
            console.log(sql);
            console.log('   ' + '='.repeat(60));
            return false;
        }

        console.log(`   ✅ ${viewName} applied successfully`);
        return true;
    } catch (error) {
        console.error(`   ❌ Error applying ${viewName}:`, error);

        // Output SQL for manual execution
        const sql = fs.readFileSync(filePath, 'utf-8');
        console.log('\n   ℹ️  Please run this SQL manually in your Supabase SQL Editor:');
        console.log('   ' + '='.repeat(60));
        console.log(sql);
        console.log('   ' + '='.repeat(60));
        return false;
    }
}

async function main() {
    console.log('🚀 Applying Database View Optimizations');
    console.log('=========================================\n');

    const viewsDir = path.join(__dirname, '..', 'sql', 'views');

    // Apply users_summary view
    const usersSummaryPath = path.join(viewsDir, 'users_summary.sql');
    await applyView('users_summary', usersSummaryPath);

    // Apply updated member_hours_summary view
    const memberHoursSummaryPath = path.join(viewsDir, 'member_hours_summary.sql');
    await applyView('member_hours_summary', memberHoursSummaryPath);

    console.log('\n=========================================');
    console.log('✅ View optimization script completed!');
    console.log('\nNext steps:');
    console.log('1. Verify views were created in Supabase Dashboard → SQL Editor');
    console.log('2. Run TypeScript code updates');
    console.log('3. Test with: npm test -- performance.test.ts');
}

main().catch(console.error);

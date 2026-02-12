/**
 * Compare API results (events-check-results.json) vs Supabase ground truth (CSV export)
 */

import { readFileSync } from 'fs';

const API_RESULTS_PATH = './events-check-results.json';
const SUPABASE_CSV_PATH = './Supabase Snippet Find members by name.csv';

// Parse API results
const apiResults = JSON.parse(readFileSync(API_RESULTS_PATH, 'utf-8'));

// Parse Supabase CSV properly (handles quoted fields with commas, \r\n line endings)
function parseCSV(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');

  for (let i = 1; i < lines.length; i++) { // skip header
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse that handles quoted fields
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());

    // fields: [email, event_id, event_name, status, event_date]
    if (fields.length >= 4) {
      rows.push({
        email: fields[0],
        event_id: fields[1],
        event_name: fields[2],
        status: fields[3],
        event_date: fields[4] || '',
      });
    }
  }
  return rows;
}

const csvRaw = readFileSync(SUPABASE_CSV_PATH, 'utf-8');
const supabaseRows = parseCSV(csvRaw);

// Build Supabase ground truth: { email -> Set of "event_id:status" }
const supabaseData = {};
for (const row of supabaseRows) {
  if (!supabaseData[row.email]) supabaseData[row.email] = new Set();
  supabaseData[row.email].add(`${row.event_id}:${row.status}`);
}

// Build API data: { email -> Set of "event_id:status" }
const apiData = {};
for (const entry of apiResults.data) {
  const email = entry.email;
  if (!apiData[email]) apiData[email] = new Set();
  for (const ev of entry.rsvped_events) {
    apiData[email].add(`${ev.event_id}:rsvped`);
  }
  for (const ev of entry.attended_events) {
    apiData[email].add(`${ev.event_id}:attended`);
  }
}

// Compare
const allEmails = new Set([...Object.keys(supabaseData), ...Object.keys(apiData)]);
let totalMatches = 0;
let totalMissingFromApi = 0;
let totalExtraInApi = 0;
let usersMatched = 0;
let usersMismatched = 0;
const mismatches = [];

for (const email of [...allEmails].sort()) {
  const sbSet = supabaseData[email] || new Set();
  const apiSet = apiData[email] || new Set();

  const matched = [...sbSet].filter(x => apiSet.has(x));
  const missingFromApi = [...sbSet].filter(x => !apiSet.has(x));
  const extraInApi = [...apiSet].filter(x => !sbSet.has(x));

  totalMatches += matched.length;
  totalMissingFromApi += missingFromApi.length;
  totalExtraInApi += extraInApi.length;

  if (missingFromApi.length === 0 && extraInApi.length === 0) {
    usersMatched++;
  } else {
    usersMismatched++;
    mismatches.push({ email, matched: matched.length, missingFromApi, extraInApi });
  }
}

// Print report
console.log('='.repeat(80));
console.log('  API vs SUPABASE COMPARISON');
console.log('='.repeat(80));
console.log(`  Total users in Supabase:      ${Object.keys(supabaseData).length}`);
console.log(`  Total users in API:            ${Object.keys(apiData).length}`);
console.log(`  Total Supabase records:        ${supabaseRows.length}`);
console.log('');
console.log(`  Users fully matched:           ${usersMatched}`);
console.log(`  Users with differences:        ${usersMismatched}`);
console.log('');
console.log(`  Records matched (both agree):  ${totalMatches}`);
console.log(`  In Supabase, NOT in API:       ${totalMissingFromApi}`);
console.log(`  In API, NOT in Supabase:       ${totalExtraInApi}`);

const matchPct = ((totalMatches / (totalMatches + totalMissingFromApi + totalExtraInApi)) * 100).toFixed(1);
console.log(`\n  Match rate: ${matchPct}%`);

if (mismatches.length === 0) {
  console.log('\n  ALL RECORDS MATCH! API returns correct data for all users.');
} else {
  console.log('\n' + '-'.repeat(80));
  console.log('  DIFFERENCES BY USER:');
  console.log('-'.repeat(80));
  console.log('  NOTE: "In Supabase, NOT API" = old events the API no longer returns');
  console.log('        "In API, NOT Supabase" = potential data mismatch\n');

  for (const m of mismatches) {
    console.log(`  ${m.email} (${m.matched} matched):`);
    if (m.missingFromApi.length > 0) {
      console.log(`    In DB but NOT API (${m.missingFromApi.length}):`);
      for (const entry of m.missingFromApi.slice(0, 5)) {
        const [eventId, status] = entry.split(':');
        console.log(`      - event ${eventId} (${status})`);
      }
      if (m.missingFromApi.length > 5) {
        console.log(`      ... and ${m.missingFromApi.length - 5} more`);
      }
    }
    if (m.extraInApi.length > 0) {
      console.log(`    In API but NOT DB (${m.extraInApi.length}):`);
      for (const entry of m.extraInApi.slice(0, 5)) {
        const [eventId, status] = entry.split(':');
        console.log(`      - event ${eventId} (${status})`);
      }
      if (m.extraInApi.length > 5) {
        console.log(`      ... and ${m.extraInApi.length - 5} more`);
      }
    }
    console.log('');
  }
}

console.log('='.repeat(80));

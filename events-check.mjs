/**
 * Events RSVP Check - Hit /events for all users concurrently
 * Captures per-user RSVP data for comparison with Supabase.
 *
 * Usage:
 *   node events-check.mjs --csv users.csv
 *   node events-check.mjs --csv users.csv --users 50
 */

import { readFileSync, writeFileSync } from 'fs';

const BASE_URL = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:3000';

const CSV_PATH = process.argv.includes('--csv')
  ? process.argv[process.argv.indexOf('--csv') + 1]
  : null;

if (!CSV_PATH) {
  console.error('Usage: node events-check.mjs --csv <path-to-csv> [--users N] [--base URL]');
  process.exit(1);
}

function loadUsers(csvPath) {
  const raw = readFileSync(csvPath, 'utf-8').trim();
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0].toLowerCase();
  const startIdx = (firstLine.includes('user_id') || firstLine.includes('email') || firstLine.includes('id')) ? 1 : 0;

  const users = [];
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    if (parts.length >= 2) {
      users.push({ id: parts[0], email: parts[1] });
    }
  }
  return users;
}

const ALL_USERS = loadUsers(CSV_PATH);
const MAX_USERS = process.argv.includes('--users')
  ? parseInt(process.argv[process.argv.indexOf('--users') + 1])
  : ALL_USERS.length;
const USERS = ALL_USERS.slice(0, MAX_USERS);

console.log(`Loaded ${USERS.length} users from ${CSV_PATH}`);
console.log(`Hitting GET /events for all ${USERS.length} users concurrently...\n`);

async function fetchEventsForUser(user) {
  const res = await fetch(`${BASE_URL}/events`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token-for-load-test',
      'X-Test-User-Id': user.id,
      'X-Test-User-Email': user.email,
      'X-Test-User-Role': 'general-member',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    return { user, error: `HTTP ${res.status}`, events: [] };
  }

  const events = await res.json();
  return { user, error: null, events };
}

async function main() {
  const start = performance.now();

  // Fire all users concurrently
  const results = await Promise.all(USERS.map(u => fetchEventsForUser(u)));

  const duration = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`All ${USERS.length} requests completed in ${duration}s\n`);

  // Build RSVP summary: for each user, which events they're RSVP'd to
  const rsvpSummary = [];
  let totalRsvps = 0;
  let errors = 0;

  for (const result of results) {
    if (result.error) {
      errors++;
      console.log(`  ERROR: ${result.user.email} - ${result.error}`);
      continue;
    }

    const rsvpedEvents = result.events
      .filter(e => e.user_rsvped === true)
      .map(e => ({
        event_id: e.id,
        event_name: e.event_name,
        event_date: e.event_date,
      }));

    const attendedEvents = result.events
      .filter(e => e.user_attended === true)
      .map(e => ({
        event_id: e.id,
        event_name: e.event_name,
        event_date: e.event_date,
      }));

    if (rsvpedEvents.length > 0 || attendedEvents.length > 0) {
      rsvpSummary.push({
        user_id: result.user.id,
        email: result.user.email,
        rsvped_events: rsvpedEvents,
        attended_events: attendedEvents,
      });
      totalRsvps += rsvpedEvents.length;
    }
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('  EVENTS RSVP SUMMARY');
  console.log('='.repeat(80));
  console.log(`  Users queried:     ${USERS.length}`);
  console.log(`  Errors:            ${errors}`);
  console.log(`  Users with RSVPs:  ${rsvpSummary.length}`);
  console.log(`  Total RSVPs:       ${totalRsvps}`);
  console.log('');

  for (const entry of rsvpSummary) {
    console.log(`  ${entry.email} (${entry.user_id.slice(0, 8)}...)`);
    for (const ev of entry.rsvped_events) {
      console.log(`    RSVP: [${ev.event_id}] ${ev.event_name} (${ev.event_date})`);
    }
    for (const ev of entry.attended_events) {
      console.log(`    ATTENDED: [${ev.event_id}] ${ev.event_name} (${ev.event_date})`);
    }
    console.log('');
  }

  console.log('='.repeat(80));

  // Save to JSON for easy comparison
  const output = {
    timestamp: new Date().toISOString(),
    users_queried: USERS.length,
    errors,
    total_rsvps: totalRsvps,
    data: rsvpSummary,
  };
  writeFileSync('events-check-results.json', JSON.stringify(output, null, 2));
  console.log(`\nFull results saved to events-check-results.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

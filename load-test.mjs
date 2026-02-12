/**
 * Load Test - Concurrent Users from CSV
 * Simulates realistic user flows hitting the backend API.
 * Loads real user IDs/emails from a CSV file.
 *
 * Usage:
 *   node load-test.mjs --csv users.csv                # required: CSV with user_id,email columns
 *   node load-test.mjs --csv users.csv --users 50     # limit to first 50 users
 *   node load-test.mjs --csv users.csv --base https://...  # custom base URL
 *
 * CSV format (with or without header row):
 *   user_id,email
 *   c4a9d432-2bf1-44f3-b77a-bf19a42f0bc0,user@example.com
 */

import { readFileSync } from 'fs';

const BASE_URL = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:3000';

const CSV_PATH = process.argv.includes('--csv')
  ? process.argv[process.argv.indexOf('--csv') + 1]
  : null;

if (!CSV_PATH) {
  console.error('Usage: node load-test.mjs --csv <path-to-csv> [--users N] [--base URL]');
  console.error('\nCSV format: user_id,email');
  process.exit(1);
}

// Parse CSV
function loadUsers(csvPath) {
  const raw = readFileSync(csvPath, 'utf-8').trim();
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  // Detect if first row is a header
  const firstLine = lines[0].toLowerCase();
  const startIdx = (firstLine.includes('user_id') || firstLine.includes('email') || firstLine.includes('id')) ? 1 : 0;

  const users = [];
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    if (parts.length >= 2) {
      users.push({ id: parts[0], email: parts[1] });
    } else if (parts.length === 1) {
      // single column — treat as user_id
      users.push({ id: parts[0], email: '' });
    }
  }
  return users;
}

const ALL_USERS = loadUsers(CSV_PATH);

const MAX_USERS = process.argv.includes('--users')
  ? parseInt(process.argv[process.argv.indexOf('--users') + 1])
  : ALL_USERS.length;

const USERS = ALL_USERS.slice(0, MAX_USERS);
const NUM_USERS = USERS.length;

if (NUM_USERS === 0) {
  console.error(`No users found in ${CSV_PATH}`);
  process.exit(1);
}

console.log(`Loaded ${NUM_USERS} users from ${CSV_PATH}`);

// ── Endpoint definitions ──────────────────────────────────────────────────
// Weight = relative probability a user hits this endpoint (simulates real traffic)
const ENDPOINTS = [
  // High traffic - what most users do
  { method: 'GET',  path: '/events/public',              weight: 10, name: 'Get Public Events' },
  { method: 'GET',  path: '/events',                     weight: 8,  name: 'Get Events (auth)' },
  { method: 'GET',  path: '/member-info/active/summary',  weight: 8,  name: 'Active Members Summary' },
  { method: 'GET',  path: '/announcements',               weight: 7,  name: 'Get Announcements' },
  { method: 'GET',  path: '/eboard',                      weight: 5,  name: 'Get E-Board' },
  { method: 'GET',  path: '/links',                        weight: 5,  name: 'Get Links' },
  { method: 'GET',  path: '/resources',                    weight: 5,  name: 'Get Resources' },
  { method: 'GET',  path: '/sponsors/names',               weight: 4,  name: 'Get Sponsor Names' },
  { method: 'GET',  path: '/sponsors',                     weight: 3,  name: 'Get Sponsors' },
  { method: 'GET',  path: '/member-info/alumni/summary',   weight: 3,  name: 'Alumni Summary' },

  // Medium traffic
  { method: 'GET',  path: '/users',                        weight: 2,  name: 'Get Users' },
  { method: 'GET',  path: '/sponsors/get-all-sponsor-info', weight: 2, name: 'All Sponsor Info' },

  // Health check
  { method: 'GET',  path: '/',                             weight: 1,  name: 'Health Check' },
];

// Build weighted pool for random selection
const endpointPool = [];
for (const ep of ENDPOINTS) {
  for (let i = 0; i < ep.weight; i++) {
    endpointPool.push(ep);
  }
}

function pickRandom() {
  return endpointPool[Math.floor(Math.random() * endpointPool.length)];
}

// ── Metrics ───────────────────────────────────────────────────────────────
const metrics = {
  total: 0,
  success: 0,
  errors: 0,
  byEndpoint: {},    // { name: { count, totalMs, min, max, errors, statuses } }
  responseTimes: [], // all response times for percentile calc
  startTime: 0,
};

function recordMetric(name, durationMs, status, error) {
  metrics.total++;
  if (!metrics.byEndpoint[name]) {
    metrics.byEndpoint[name] = { count: 0, totalMs: 0, min: Infinity, max: 0, errors: 0, statuses: {} };
  }
  const ep = metrics.byEndpoint[name];
  ep.count++;
  ep.totalMs += durationMs;
  ep.min = Math.min(ep.min, durationMs);
  ep.max = Math.max(ep.max, durationMs);
  ep.statuses[status] = (ep.statuses[status] || 0) + 1;

  if (error || status >= 400) {
    metrics.errors++;
    ep.errors++;
  } else {
    metrics.success++;
  }
  metrics.responseTimes.push(durationMs);
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Single request ────────────────────────────────────────────────────────
async function makeRequest(endpoint, user) {
  const url = `${BASE_URL}${endpoint.path}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Test-User-Id': user.id,
    'X-Test-User-Email': user.email,
    'Authorization': 'Bearer test-token-for-load-test',
  };

  const start = performance.now();
  let status = 0;
  let error = null;

  try {
    const res = await fetch(url, {
      method: endpoint.method,
      headers,
      signal: AbortSignal.timeout(15000), // 15s timeout
    });
    status = res.status;
    await res.text(); // consume body
  } catch (err) {
    error = err.message || 'unknown error';
    status = 0;
  }

  const duration = performance.now() - start;
  recordMetric(endpoint.name, duration, status, error);
  return { status, duration, error };
}

// ── Virtual user ──────────────────────────────────────────────────────────
// Each user makes 5-10 requests with random delays (simulates browsing)
async function virtualUser(userId) {
  const user = USERS[userId];
  const numRequests = 5 + Math.floor(Math.random() * 6); // 5-10 requests

  for (let i = 0; i < numRequests; i++) {
    const endpoint = pickRandom();
    await makeRequest(endpoint, user);

    // Random think time between requests (100-500ms)
    const delay = 100 + Math.floor(Math.random() * 400);
    await new Promise(r => setTimeout(r, delay));
  }
}

// ── Report ────────────────────────────────────────────────────────────────
function printReport() {
  const elapsed = (performance.now() - metrics.startTime) / 1000;
  const rps = metrics.total / elapsed;

  console.log('\n' + '='.repeat(80));
  console.log('  LOAD TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`  Virtual Users:    ${NUM_USERS}`);
  console.log(`  Total Requests:   ${metrics.total}`);
  console.log(`  Duration:         ${elapsed.toFixed(2)}s`);
  console.log(`  Throughput:       ${rps.toFixed(1)} req/s`);
  console.log(`  Success:          ${metrics.success} (${((metrics.success / metrics.total) * 100).toFixed(1)}%)`);
  console.log(`  Errors:           ${metrics.errors} (${((metrics.errors / metrics.total) * 100).toFixed(1)}%)`);

  if (metrics.responseTimes.length > 0) {
    console.log('\n  Response Times:');
    console.log(`    Min:    ${percentile(metrics.responseTimes, 0).toFixed(0)}ms`);
    console.log(`    Avg:    ${(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length).toFixed(0)}ms`);
    console.log(`    p50:    ${percentile(metrics.responseTimes, 50).toFixed(0)}ms`);
    console.log(`    p90:    ${percentile(metrics.responseTimes, 90).toFixed(0)}ms`);
    console.log(`    p95:    ${percentile(metrics.responseTimes, 95).toFixed(0)}ms`);
    console.log(`    p99:    ${percentile(metrics.responseTimes, 99).toFixed(0)}ms`);
    console.log(`    Max:    ${percentile(metrics.responseTimes, 100).toFixed(0)}ms`);
  }

  console.log('\n' + '-'.repeat(80));
  console.log('  ENDPOINT BREAKDOWN');
  console.log('-'.repeat(80));
  console.log(
    '  ' +
    'Endpoint'.padEnd(28) +
    'Reqs'.padStart(6) +
    'Avg'.padStart(8) +
    'Min'.padStart(8) +
    'Max'.padStart(8) +
    'p95'.padStart(8) +
    'Err'.padStart(6) +
    '  Statuses'
  );
  console.log('  ' + '-'.repeat(78));

  // Sort by count descending
  const sorted = Object.entries(metrics.byEndpoint).sort((a, b) => b[1].count - a[1].count);

  for (const [name, ep] of sorted) {
    const epTimes = metrics.responseTimes; // simplified - would need per-endpoint tracking for exact p95
    const avg = (ep.totalMs / ep.count).toFixed(0);
    const statuses = Object.entries(ep.statuses).map(([s, c]) => `${s}:${c}`).join(' ');
    console.log(
      '  ' +
      name.padEnd(28) +
      String(ep.count).padStart(6) +
      `${avg}ms`.padStart(8) +
      `${ep.min.toFixed(0)}ms`.padStart(8) +
      `${ep.max.toFixed(0)}ms`.padStart(8) +
      `${'--'}`.padStart(8) +
      String(ep.errors).padStart(6) +
      `  ${statuses}`
    );
  }

  console.log('\n' + '='.repeat(80));

  // Warnings
  const avgTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
  if (avgTime > 2000) {
    console.log('  WARNING: Average response time > 2s. Backend may be struggling.');
  }
  if (metrics.errors / metrics.total > 0.05) {
    console.log('  WARNING: Error rate > 5%. Check server logs.');
  }
  if (rps < 10) {
    console.log('  WARNING: Throughput < 10 req/s. Possible bottleneck.');
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nLoad Test: ${NUM_USERS} concurrent users -> ${BASE_URL}`);
  console.log(`Each user makes 5-10 requests with 100-500ms think time\n`);

  // Quick health check first
  try {
    const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    console.log('Health check passed. Starting load test...\n');
  } catch (err) {
    console.error(`Cannot reach ${BASE_URL} - is the server running?`);
    console.error(`Start it with: npm run dev\n`);
    process.exit(1);
  }

  metrics.startTime = performance.now();

  // Launch all virtual users concurrently
  const users = [];
  for (let i = 0; i < NUM_USERS; i++) {
    users.push(virtualUser(i));
  }

  // Progress indicator
  const progressInterval = setInterval(() => {
    process.stdout.write(`\r  Requests completed: ${metrics.total} | Errors: ${metrics.errors}`);
  }, 500);

  await Promise.all(users);

  clearInterval(progressInterval);
  process.stdout.write('\r' + ' '.repeat(60) + '\r');

  printReport();
}

main();

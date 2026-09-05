// BuildNerve — runnable dispute behavioural test suite.
//
// Invokes the `dispute-launch-check` edge function's `run_test_suite` action,
// which runs the full behavioural access-control / append-only / privacy /
// authority / workflow matrix against the live backend using disposable test
// fixtures (users, organisation, job, dispute, events, records) that are
// created and cleaned up server-side. No mocks — every assertion exercises
// real Row Level Security through user-scoped clients.
//
// Usage (documented command):
//   node scripts/run-dispute-tests.mjs
//
// Required environment variables:
//   VITE_PUBLIC_SUPABASE_URL           (auto-loaded from .env if present)
//   VITE_PUBLIC_SUPABASE_ANON_KEY      (auto-loaded from .env if present)
//   BUILDNERVE_TEST_STAFF_EMAIL        a platform-staff account holding disputes_view_audit
//   BUILDNERVE_TEST_STAFF_PASSWORD     that account's password
//
// Exit code 0 when the suite runs and every test passes; 1 on any failure.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env (does not override already-set environment variables).
try {
  const raw = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] === undefined) process.env[key] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  /* no .env file */
}

const url = process.env.VITE_PUBLIC_SUPABASE_URL;
const anonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.BUILDNERVE_TEST_STAFF_EMAIL;
const password = process.env.BUILDNERVE_TEST_STAFF_PASSWORD;

if (!url || !anonKey) {
  console.error('Missing VITE_PUBLIC_SUPABASE_URL / VITE_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(2);
}
if (!email || !password) {
  console.error('Missing BUILDNERVE_TEST_STAFF_EMAIL / BUILDNERVE_TEST_STAFF_PASSWORD');
  process.exit(2);
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr || !authData?.session) {
  console.error('Staff sign-in failed:', authErr?.message ?? 'no session');
  process.exit(2);
}

const resp = await fetch(`${url}/functions/v1/dispute-launch-check`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authData.session.access_token}`,
    apikey: anonKey,
  },
  body: JSON.stringify({ action: 'run_test_suite' }),
});

const body = await resp.json().catch(() => ());
if (!resp.ok) {
  console.error('Suite request failed:', resp.status, body?.error || body);
  process.exit(2);
}

const groups = {};
for (const t of body.tests || []) {
  (groups[t.group] ||= []).push(t);
}

for (const [group, tests] of Object.entries(groups)) {
  console.log(`\n== ${String(group).toUpperCase()} ==`);
  for (const t of tests) {
    console.log(`  ${t.pass ? 'PASS' : 'FAIL'}  ${t.id}`);
    console.log(`        ${t.evidence}`);
  }
}

const s = body.summary || {};
console.log(`\nSummary: ${s.passed ?? 0} passed / ${s.failed ?? 0} failed / ${s.total ?? 0} total (ready: ${body.ready})`);
if (body.reason) console.log(`Reason: ${body.reason}`);

process.exit(body.ready && (s.failed ?? 0) === 0 ? 0 : 1);
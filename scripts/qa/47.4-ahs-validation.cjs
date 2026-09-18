/* global require, console */
// Explicit single-use Task 6 audit harness, not a resumable import service.
// No data is derived from aggregated totals. Transactions are per reservation.
// After interruption, never delete the checkpoint or repeat apply. Treat a lost
// response as potentially committed: inspect rule/fact history through GET APIs
// and reconcile IDs, versions, payload and actor before any reviewed recovery.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local', quiet: true });
const folder = path.resolve('docs/qa/e2e');
const project = 'wrqjpyyopwgyqluqkcga';
const plan = JSON.parse(fs.readFileSync(path.join(folder, '47.4-ahs-confirmed-write-plan-20260912.json')));
const preflightBytes = fs.readFileSync(path.join(folder, '47.4-ahs-task6-preflight-20260912.json'));
const preflight = JSON.parse(preflightBytes);
const resultPath = path.join(folder, '47.4-ahs-execution-20260912.json');
const base = 'http://127.0.0.1:3000';
const mode = process.argv[2] || 'inspect';
assert.ok(['inspect', 'apply', 'preview'].includes(mode));
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, `https://${project}.supabase.co`);
assert.equal(plan.stagingProject, project);
assert.equal(crypto.createHash('sha256').update(preflightBytes).digest('hex'), plan.sourceManifestSha256);
assert.equal(plan.reservations.length, preflight.reservation_confirmations.length);
assert.equal(new Set(plan.reservations.map(row => row.reservationId)).size, 25);
for (const row of plan.reservations) {
  const before = preflight.reservation_confirmations.find(item => item.id === row.reservationId);
  assert.ok(before);
  assert.equal(row.propertyId, before.property_id);
  assert.equal(row.payload.declaredOwnerBaseAmount, before.accepted_pdf_amount);
  assert.equal(row.payload.currency, 'EUR');
  assert.equal(row.payload.factMode, 'declared_owner_base');
  assert.equal(row.payload.expectedCurrentVersion, null);
}

if (mode === 'apply') {
  assert.equal(process.env.AHS_CONFIRMED_MANIFEST_APPLY, '1', 'Explicit confirmed-manifest opt-in required');
  assert.ok(!fs.existsSync(resultPath), 'Checkpoint exists: do not delete it or repeat apply. Reconcile rule/fact history through GET APIs; an ambiguous response may already be committed. Any remaining mutation requires separate manual review.');
}
(async () => {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (executablePath) {
    assert.ok(fs.statSync(executablePath).isFile(), 'Configured Chromium executable must be a file');
    fs.accessSync(executablePath, fs.constants.X_OK);
  }
  // Use Playwright-managed Chromium unless an existing executable is configured.
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    const page = await browser.newPage();
    await page.goto(base + '/pt-BR/login');
    const reject = page.getByRole('button', { name: 'Rejeitar Opcionais' });
    await reject.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await reject.isVisible()) await reject.click();
    await page.locator('input[name="email"]').fill(process.env.TEST_USER_EMAIL);
    await page.locator('input[name="password"]').fill(process.env.TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    async function api(route, method = 'GET', data) {
      const response = await page.request.fetch(base + route, { method, data });
      const body = await response.json();
      if (!response.ok()) throw Error(`${method} ${route}: HTTP ${response.status()} ${JSON.stringify(body)}`);
      return body;
    }
    if (mode === 'inspect') {
      for (const rule of plan.rules) {
        const read = await api(`/api/properties/${rule.propertyId}/payout-rules`);
        assert.equal(read.currentRule?.id ?? null, rule.payload.expectedCurrentRuleId);
      }
      console.log('Authenticated current-rule preflight PASS');
      return;
    }
    if (mode === 'apply') {
      // Read exact individual monetary rows with the same authorized test account.
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
      const auth = await client.auth.signInWithPassword({ email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASSWORD });
      assert.ifError(auth.error);
      const columns = 'id,property_id,organization_id,total_amount,total_price,currency,status,check_in,check_out,booking_source';
      const { data: live, error } = await client.from('reservations').select(columns).in('id', plan.reservations.map(row => row.reservationId));
      assert.ifError(error);
      assert.equal(live.length, 25);
      for (const before of preflight.reservation_confirmations) {
        const row = live.find(value => value.id === before.id);
        for (const key of columns.split(',').filter(key => !['total_amount', 'total_price'].includes(key))) assert.equal(row[key], before[key], `${before.id}: ${key} changed`);
        assert.equal(Number(row.total_amount), Number(before.total_amount));
        assert.equal(row.total_price === null ? null : Number(row.total_price), before.total_price === null ? null : Number(before.total_price));
        const facts = await api(`/api/reservations/${before.id}/financial-facts`);
        assert.equal(facts.currentSnapshot, null, 'Current snapshot changed; do not overwrite');
      }
      const execution = { project, at: new Date().toISOString(), rules: [], snapshots: [], status: 'in_progress' };
      const checkpoint = () => fs.writeFileSync(resultPath, JSON.stringify(execution, null, 2) + '\n');
      checkpoint();
      for (const rule of plan.rules) {
        const result = await api(`/api/properties/${rule.propertyId}/payout-rules`, 'POST', rule.payload);
        execution.rules.push({ propertyId: rule.propertyId, requestId: result.requestId, previousRuleId: result.previousRule?.id ?? null, currentRule: result.currentRule });
        checkpoint();
      }
      for (const row of plan.reservations) {
        const result = await api(`/api/reservations/${row.reservationId}/financial-facts`, 'PUT', row.payload);
        const snapshot = result.currentSnapshot;
        assert.equal(snapshot.factMode, 'declared_owner_base');
        assert.equal(snapshot.version, 1);
        assert.equal(Number(snapshot.declaredOwnerBaseAmount), Number(row.payload.declaredOwnerBaseAmount));
        assert.equal(snapshot.currency, 'EUR');
        assert.ok(snapshot.capturedBy?.id);
        execution.snapshots.push({ reservationId: row.reservationId, requestId: result.requestId, version: snapshot.version, amount: snapshot.declaredOwnerBaseAmount, currency: snapshot.currency, capturedAt: snapshot.capturedAt, capturedBy: snapshot.capturedBy.id, compatibility: result.reservation.compatibility });
        checkpoint();
        console.log(`Confirmed reservation ${row.reservationId}`);
      }
      execution.status = 'complete';
      checkpoint();
    }
    const execution = JSON.parse(fs.readFileSync(resultPath));
    assert.equal(execution.status, 'complete');
    const previews = [];
    for (const rule of execution.rules) {
      for (const periodo of ['2026-07', '2026-08']) {
        const result = await api(`/api/properties/${rule.propertyId}/payout-rules/preview`, 'POST', { mode: 'persisted', periodo, ruleId: rule.currentRule.id });
        previews.push({ propertyId: rule.propertyId, periodo, response: result });
        fs.writeFileSync(path.join(folder, '47.4-ahs-six-previews-20260912.json'), JSON.stringify(previews, null, 2) + '\n');
        console.log(`Canonical preview ${rule.propertyId} ${periodo}: HTTP 200`);
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });

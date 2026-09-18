// Staging-only disposable concurrency proof. Never logs credentials.
/* global require, URL, fetch, AbortSignal, console */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const base = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(base).hostname, 'wrqjpyyopwgyqluqkcga.supabase.co');
const key = env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(key);
const fixtures = [
  {
    "name": "Story47.4-concurrency-authorized-20260912-1",
    "property_id": "81682c25-0cb3-4c4b-a316-529cabcc1408",
    "reservation_id": "de69c5fc-48fa-4708-8540-330d76b4c3d6",
    "rule_id": "8d4175f2-20de-4d5f-bf82-64ec900dfe0d"
  },
  {
    "name": "Story47.4-concurrency-authorized-20260912-2",
    "property_id": "6aab6bd2-9c81-4de8-99fa-c64818100fa8",
    "reservation_id": "8892a156-6e3f-4239-a3bf-fde358252e95",
    "rule_id": "b9513790-49d6-43f9-a220-f991c5e982b2"
  },
  {
    "name": "Story47.4-concurrency-authorized-20260912-3",
    "property_id": "576c5f79-3561-4b03-b10f-826075703952",
    "reservation_id": "c7d44057-9745-4afb-9b68-a78430d208a2",
    "rule_id": "454e8da2-cdd9-4a14-885c-ed9a2dfbd894"
  },
  {
    "name": "Story47.4-concurrency-authorized-20260912-4",
    "property_id": "b75c2363-fbcc-461b-8099-44210710d013",
    "reservation_id": "d3fd95c9-00cc-495b-8483-a7c9c432f53d",
    "rule_id": "20644789-22e3-4a22-8ce5-4b23f0754a2c"
  }
];
const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
async function api(path, body) {
  const r = await fetch(base + '/rest/v1/' + path, {
    method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const text = await r.text();
  if (!r.ok) throw Error('HTTP ' + r.status + ': ' + text);
  return JSON.parse(text);
}
async function state(id) {
  const [reservation, snapshots] = await Promise.all([
    api('reservations?id=eq.' + id + '&select=id,total_amount,total_price'),
    api('reservation_financial_snapshots?reservation_id=eq.' + id + '&superseded_at=is.null&select=version,fact_mode,declared_owner_base_amount,source_metadata')
  ]);
  return { reservation: reservation[0], snapshots };
}
const specs = [
  ['capture_then_generic', 'capture', 'generic', 'PT409', 'FINANCIAL_TOTAL_MANAGED_BY_SNAPSHOT'],
  ['generic_then_capture', 'generic', 'capture', '00000', 'OK'],
  ['rule_then_capture', 'replace_rule', 'capture', '22023', 'DECLARED_OWNER_BASE_NOT_ALLOWED'],
  ['capture_then_rule', 'capture', 'replace_rule', '00000', 'OK']
];
(async () => {
  const results = [];
  for (let i = 0; i < specs.length; i++) {
    const [name, first, second, code, message] = specs[i];
    const fixture = fixtures[i];
    const before = await state(fixture.reservation_id);
    const start = Date.now() + 1500;
    const request = (operation, lag, hold) => ({
      p_reservation_id: fixture.reservation_id, p_operation: operation,
      p_start_at: new Date(start + lag).toISOString(), p_hold_ms: hold,
      p_expected_version: null, p_amount: operation === 'generic' ? 999 : 321.09
    });
    const [a, b] = await Promise.all([
      api('rpc/story474_concurrency_probe', request(first, 0, 4000)),
      api('rpc/story474_concurrency_probe', request(second, 1000, 0))
    ]);
    assert.notEqual(a.pid, b.pid, name + ': separate database connections');
    assert.equal(a.code, '00000', JSON.stringify(a));
    assert.equal(b.code, code, JSON.stringify(b));
    assert.equal(b.message, message);
    assert.ok(Date.parse(b.started) < Date.parse(a.ended), name + ': second started while first held lock');
    assert.ok(Date.parse(b.ended) >= Date.parse(a.ended), name + ': second finished after first released');
    assert.ok(Date.parse(a.ended) - Date.parse(a.acquired) < 5000, name + ': hold under five seconds');
    const after = await state(fixture.reservation_id);
    assert.equal(after.reservation.total_price, before.reservation.total_price, name + ': legacy total_price unchanged');
    if (name === 'rule_then_capture') {
      assert.equal(after.reservation.total_amount, 100);
      assert.equal(after.snapshots.length, 0);
    } else {
      assert.equal(after.reservation.total_amount, 321.09);
      assert.equal(after.snapshots[0].declared_owner_base_amount, 321.09);
    }
    results.push({ name, fixture, before, a, b, after, overlapVerified: true });
    console.log(name + ': PASS; pids=' + a.pid + '/' + b.pid + '; overlap=' +
      (Date.parse(a.ended) - Date.parse(b.started)) + 'ms');
  }
  fs.writeFileSync('docs/qa/e2e/47.4-concurrency-20260912.json', JSON.stringify(results, null, 2) + '\n');
})().catch(e => { console.error(e.message); process.exitCode = 1; });

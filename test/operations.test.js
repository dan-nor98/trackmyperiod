import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.mjs';
import { useRuntime } from './sdk.mjs';
import importLegacy from 'lib/import-legacy';
import maintenance from 'lib/maintenance';
import smoke from 'lib/smoke';
import { Store } from 'lib/store';
test('legacy import preserves tracking but resets unsafe sharing and reminders; retry skips existing rows',async()=>{
  const f=fixture(); useRuntime(f);
  const input={accounts:[{id:1,role:'primary',language:'fa',calendar:'persian',
    cycles:[{id:'legacy1',start_date:'2025-01-01',end_date:'2025-01-05'}],
    symptoms:[{date:'2025-01-02',name:'cramps',severity:1},{date:'2025-01-02',name:'cramps',severity:1}]}]};
  assert.deepEqual(await importLegacy(input),{inserted:1,skipped:0});
  const a=await new Store(f.db).get(1);
  assert.equal(a.state.language,'fa'); assert.equal(a.state.calendar,'persian'); assert.equal(a.partner_id,null);
  assert.equal(a.state.reminder,null); assert.equal(a.state.symptoms.length,1);
  assert.deepEqual(await importLegacy(input),{inserted:0,skipped:1});
});
test('legacy validation rejects overlapping records before any insert',async()=>{
  const f=fixture(); useRuntime(f);
  await assert.rejects(importLegacy({accounts:[{id:1,role:'primary',language:'en',cycles:[
    {id:'a',start_date:'2025-01-01',end_date:'2025-01-05'},
    {id:'b',start_date:'2025-01-04',end_date:'2025-01-09'}],symptoms:[]}]}),/overlap/);
  assert.equal((await f.db.all('SELECT * FROM accounts')).length,0);
});
test('maintenance removes expired deletion tombstones and invalid grants',async()=>{
  const f=fixture(); useRuntime(f); const store=new Store(f.db),now=Date.now();
  await store.create(1,'en',now); await store.create(2,'en',now);
  await store.mutate(1,a=>{a.role='primary';a.partner_id=2;a.state.grant='old';},now);
  await store.mutate(2,a=>{a.state.deletedAt=now-8*86400000;},now);
  const result=await maintenance();
  assert.equal(result.scanned,2); assert.equal((await store.get(1)).partner_id,null); assert.equal(await store.get(2),null);
});
test('native smoke module checks required operations without sending messages',async()=>{
  const f=fixture(); useRuntime(f); assert.equal((await smoke()).ok,true); assert.equal(f.sent.length,0);
  assert.equal(await f.db.get("SELECT * FROM jobs WHERE name='smoke'"),null);
});

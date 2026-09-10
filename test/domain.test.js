import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture,NOW,update } from './fixture.mjs';
import { handleUpdate } from 'lib/app';
import { Store,enqueue } from 'lib/store';
import { scheduleReminder,drain } from 'lib/delivery';
const run=(f,id,user,text)=>handleUpdate(update(id,user,text),{...f,now:NOW});
async function primary(f,id=1) { await run(f,1,id,'/start'); await run(f,2,id,'role primary'); }
async function pair(f,owner=1,partner=2,base=10) {
  await run(f,base,owner,'/partner'); const token=(await new Store(f.db).get(owner)).invitation;
  await run(f,base+1,partner,`join ${token}`); return token;
}
test('private chat gate prevents group disclosure and foreign callbacks',async()=>{
  const f=fixture();
  await handleUpdate(update(1,1,'/history',{chat:{id:-10,type:'group'}}),{...f,now:NOW});
  await handleUpdate({update_id:2,callback_query:{id:'x',data:'role primary',from:{id:2},message:update(1,1,'').message}},{...f,now:NOW});
  assert.equal((await f.db.all('SELECT * FROM accounts')).length,0);
});
test('duplicate updates and simultaneous starts cannot create duplicate records',async()=>{
  const f=fixture(); await primary(f);
  await Promise.all([run(f,3,1,'begin today'),run(f,3,1,'begin today'),run(f,4,1,'begin today')]);
  const a=await new Store(f.db).get(1); assert.equal(a.state.cycles.length,1);
  assert.ok(a.state.processed['3']); assert.ok(a.state.processed['4']);
});
test('invalid chronology rolls back the complete user change',async()=>{
  const f=fixture(); await primary(f); await run(f,3,1,'begin 2026-09-05');
  await run(f,4,1,'end 2026-09-04'); await run(f,5,1,'end 2026-09-30'); await run(f,6,1,'end 2026-02-30');
  assert.equal((await new Store(f.db).get(1)).state.cycles[0].end_date,null);
});
test('daily symptoms, correction and undo preserve ownership',async()=>{
  const f=fixture(); await primary(f); await run(f,3,1,'symptom cramps 2 2026-09-09');
  assert.equal((await new Store(f.db).get(1)).state.symptoms.length,1);
  await run(f,4,1,'undo'); assert.equal((await new Store(f.db).get(1)).state.symptoms.length,0);
  await run(f,5,1,'begin 2026-09-01'); await run(f,6,1,'end 2026-09-05');
  const id=(await new Store(f.db).get(1)).state.cycles[0].id;
  await run(f,7,1,`edit ${id} 2026-09-02 2026-09-06`); await run(f,8,1,'undo');
  assert.equal((await new Store(f.db).get(1)).state.cycles[0].start_date,'2026-09-01');
  await run(f,1,3,'role primary'); await run(f,2,3,`edit ${id} 2026-09-03 2026-09-06`);
  assert.equal((await new Store(f.db).get(1)).state.cycles[0].start_date,'2026-09-01');
});
test('invitation is single-use, rejects self-pairing and expired tokens',async()=>{
  const f=fixture(); await primary(f); const store=new Store(f.db);
  await run(f,3,1,'partner'); const token=(await store.get(1)).invitation;
  await run(f,4,1,`join ${token}`); assert.equal((await store.get(1)).partner_id,null);
  await handleUpdate(update(5,2,`join ${token}`),{...f,now:NOW+600001});
  assert.equal((await store.get(1)).partner_id,null);
  await run(f,6,1,'partner'); const next=(await store.get(1)).invitation;
  await Promise.all([run(f,7,2,`join ${next}`),run(f,8,3,`join ${next}`)]);
  assert.ok([2,3].includes((await store.get(1)).partner_id)); assert.equal((await store.get(1)).invitation,null);
});
test('new grants start private; disconnect cancels queued sharing and blocks former partner',async()=>{
  const f=fixture(); await primary(f); await pair(f); const store=new Store(f.db);
  assert.deepEqual((await store.get(1)).state.sharing,{periods:false,symptoms:false,reminders:false});
  await run(f,20,1,'share periods 1'); await run(f,21,1,'begin today');
  assert.ok((await store.get(1)).state.outbox.some(m=>m.scope==='periods'));
  await run(f,22,1,'disconnect'); assert.equal((await store.get(1)).state.outbox.some(m=>m.scope),false);
  await pair(f,1,3,30); await run(f,40,2,'status');
  assert.equal((await store.get(1)).state.outbox.some(m=>m.recipient===2&&m.payload.method==='status'),false);
});
test('replayed disconnect cannot revoke a newly paired owner',async()=>{
  const f=fixture(); await primary(f); await pair(f); const store=new Store(f.db);
  await run(f,20,2,'disconnect'); await primary(f,3); await pair(f,3,2,30); await run(f,20,2,'disconnect');
  assert.equal((await store.get(3)).partner_id,2);
});
test('stale callback and missing confirmation cannot delete data',async()=>{
  const f=fixture(); await primary(f); await run(f,3,1,'begin today'); await run(f,4,1,'confirm missing');
  await handleUpdate({update_id:5,callback_query:{id:'x',from:{id:1},data:'delete',message:{...update(1,1,'').message,date:NOW/1000-601}}},{...f,now:NOW});
  assert.equal((await new Store(f.db).get(1)).state.cycles.length,1);
});
test('confirmed deletion scrubs data, and replay does not resurrect it',async()=>{
  const f=fixture(); await primary(f); await run(f,3,1,'begin today'); await pair(f); await run(f,20,1,'delete');
  const store=new Store(f.db),token=Object.keys((await store.get(1)).state.confirmations)[0];
  await run(f,21,1,`confirm ${token}`); await run(f,3,1,'begin today');
  const a=await store.get(1); assert.ok(a.state.deletedAt); assert.deepEqual(a.state.cycles,[]); assert.equal(a.partner_id,null); assert.equal(a.state.outbox.length,1);
});
test('reminder scheduling uses user timezone and persists one delivery per local day',async()=>{
  const f=fixture(); await primary(f); const a=await new Store(f.db).get(1);
  a.state.timezone='Asia/Tehran'; a.state.reminder='13:00';
  a.state.cycles=[{start_date:'2026-06-19',end_date:'2026-06-23'},{start_date:'2026-07-17',end_date:'2026-07-21'},{start_date:'2026-08-14',end_date:'2026-08-18'}];
  a.state.outbox=[]; scheduleReminder(a,NOW); scheduleReminder(a,NOW);
  assert.equal(a.state.outbox.length,1); assert.equal(a.state.lastReminder,'2026-09-10');
});
test('delivery rechecks consent and leases avoid parallel duplicates',async()=>{
  const f=fixture(); await primary(f); await pair(f); const store=new Store(f.db);
  await store.mutate(1,a=>{a.state.outbox=[];enqueue(a,'private',2,{method:'notice',key:'periodChanged'},NOW,'periods');},NOW);
  await drain(f.db,f.api,class{},1,{now:NOW}); assert.equal(f.sent.length,0);
  await store.mutate(1,a=>{enqueue(a,'own',1,{method:'sendMessage',text:'saved'},NOW);},NOW);
  await Promise.all([drain(f.db,f.api,class{},1,{now:NOW}),drain(f.db,f.api,class{},1,{now:NOW})]); assert.equal(f.sent.length,1);
});
test('Telegram throttling retains reply and respects retry_after',async()=>{
  const f=fixture(); await primary(f); const store=new Store(f.db);
  await store.mutate(1,a=>{a.state.outbox=[];enqueue(a,'retry',1,{method:'sendMessage',text:'saved'},NOW);},NOW);
  f.api.sendMessage=async()=>{throw Object.assign(new Error('sensitive text'),{code:429,parameters:{retry_after:180}});};
  await drain(f.db,f.api,class{},1,{now:NOW}); const item=(await store.get(1)).state.outbox[0];
  assert.equal(item.due,NOW+180000); assert.equal(item.attempts,1);
});
test('deletion and role prompts do not revoke sharing before confirmation',async()=>{
  const f=fixture(); await primary(f); await pair(f); const store=new Store(f.db);
  await run(f,20,2,'delete'); assert.equal((await store.get(1)).partner_id,2);
  await run(f,21,2,'role primary'); assert.equal((await store.get(1)).partner_id,2);
  const actor=await store.get(2);
  const token=Object.keys(actor.state.confirmations).find(k=>actor.state.confirmations[k].command==='role primary');
  await run(f,22,2,`confirm ${token}`);
  assert.equal((await store.get(1)).partner_id,null); assert.equal((await store.get(2)).role,'primary');
});
test('cross-account recovery retains the original disconnect target after a crash',async()=>{
  const f=fixture(); await primary(f); await pair(f); const store=new Store(f.db),originalRun=f.db.run;
  let failed=false;
  f.db.run=async (query,params={})=>{
    if(!failed && params[':id']===2 && params[':document'] && JSON.parse(params[':document']).processed['20']) {
      failed=true; throw new Error('simulated crash after owner commit');
    }
    return originalRun(query,params);
  };
  await assert.rejects(run(f,20,2,'disconnect'),/simulated crash/);
  assert.equal((await store.get(1)).partner_id,null);
  await primary(f,3); await pair(f,3,2,30);
  await run(f,20,2,'disconnect'); assert.equal((await store.get(3)).partner_id,2);
});
test('export contains user records only; revoked status is cancelled before send',async()=>{
  const f=fixture(); await primary(f); await pair(f); const store=new Store(f.db);
  await run(f,20,1,'share periods 1'); await run(f,21,2,'status'); await run(f,22,1,'share periods 0');
  await store.mutate(1,a=>{a.state.outbox=a.state.outbox.filter(item=>item.payload.method==='status');},NOW);
  await drain(f.db,f.api,class{},1,{now:NOW}); assert.equal(f.sent.length,0);
  await run(f,23,1,'export');
  class File {constructor(bytes,name){this.bytes=bytes;this.name=name;}}
  await drain(f.db,f.api,File,1,{now:NOW});
  const exported=JSON.parse(new TextDecoder().decode(f.sent[0].document.bytes));
  assert.equal(exported.telegramId,1); assert.equal(exported.processed,undefined); assert.equal(exported.invitation,undefined);
});
test('changed predictions and reminder opt-out suppress already queued reminders',async()=>{
  const f=fixture(); await primary(f); const store=new Store(f.db);
  await store.mutate(1,a=>{
    a.state.outbox=[]; a.state.reminder='08:00';
    a.state.cycles=[{start_date:'2026-06-19',end_date:'2026-06-23'},{start_date:'2026-07-17',end_date:'2026-07-21'},{start_date:'2026-08-14',end_date:'2026-08-18'}];
    scheduleReminder(a,NOW);
    a.state.cycles.push({id:'new',start_date:'2026-09-10',end_date:null});
  },NOW);
  await drain(f.db,f.api,class{},1,{now:NOW}); assert.equal(f.sent.length,0);
  await run(f,20,1,'reminders off'); assert.equal((await store.get(1)).state.reminder,null);
});

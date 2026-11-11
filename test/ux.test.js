import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,NOW,update} from './fixture.mjs';
import {handleUpdate,parse} from 'lib/app';
import {Store} from 'lib/store';
import {drain} from 'lib/delivery';
import {displayDate,inputDate} from 'lib/dates';
import {home,historyPanel,calendar,reminderPanel} from 'lib/ui';

function harness() {
  const f=fixture(),store=new Store(f.db);let sequence=100;
  const run=(text,user=1)=>handleUpdate(update(sequence++,user,text),{...f,now:NOW});
  const click=(text,age=0)=>handleUpdate({update_id:sequence++,callback_query:{id:String(sequence),from:{id:1},data:text,
    message:{...update(90,1,'').message,date:(NOW-age)/1000}}},{...f,now:NOW});
  return {...f,store,run,click,get:()=>store.get(1)};
}
const buttons=panel=>panel.reply_markup.inline_keyboard.flat();
async function ready(h) {await h.run('/start');await h.run('language en');await h.run('role primary');await h.run('preference gregorian');await h.run('timezone UTC');}
async function connect(h) {
  await h.run('partner');await h.run(`join ${(await h.get()).invitation}`,2);
  const pending=(await h.get()).state.pendingJoin;
  await h.run(`confirm ${pending.token}`);
}
test('onboarding advances once through language, role, calendar and explicit timezone',async()=>{
  const h=harness();await h.run('/start');
  assert.match((await h.get()).state.outbox.at(-1).payload.text,/Step 1/);
  await h.run('language en');assert.match((await h.get()).state.outbox.at(-1).payload.text,/Step 2/);
  await h.run('role primary');assert.match((await h.get()).state.outbox.at(-1).payload.text,/Step 3/);
  await h.run('begin today');assert.equal((await h.get()).state.cycles.length,0);
  await h.run('preference gregorian');assert.match((await h.get()).state.outbox.at(-1).payload.text,/Step 4/);
  await h.run('timezone Asia/Tehran');assert.equal((await h.get()).state.onboarded,true);
  assert.match((await h.get()).state.outbox.at(-2).payload.text,/Asia\/Tehran/);
});
test('cancel invalidates destructive confirmation; deletion review identifies dates',async()=>{
  const h=harness();await ready(h);await h.run('begin 2026-09-01');await h.run('end 2026-09-04');
  const id=(await h.get()).state.cycles[0].id;await h.click(`remove ${id}`);
  let a=await h.get();const token=Object.keys(a.state.confirmations)[0];
  assert.match(a.state.outbox.at(-1).payload.text,/2026-09-01.*2026-09-04/);
  await h.click(`cancel ${token}`);await h.click(`confirm ${token}`);
  assert.equal((await h.get()).state.cycles.length,1);
});
test('old navigation remains usable while stale direct writes are rejected',async()=>{
  const h=harness();await ready(h);
  await h.click('begin today',8*86400000);assert.equal((await h.get()).state.cycles.length,0);
  await h.click('home',8*86400000);
  assert.equal((await h.get()).state.outbox.at(-1).payload.method,'editMessageText');
  await h.click('begin today',8*86400000);assert.equal((await h.get()).state.cycles.length,1);
});
test('completed past period is added atomically before a newer period',async()=>{
  const h=harness();await ready(h);await h.run('begin 2026-09-01');await h.run('end 2026-09-04');
  await h.click('newperiod');let token=(await h.get()).state.flow.token;
  await h.click(`pick ${token} 2026-08-01`);
  await h.click(`calendar pick:${token} 2026-08-01`);
  assert.ok(buttons((await h.get()).state.outbox.at(-1).payload).some(b=>b.callback_data.endsWith('ongoing')));
  await h.click(`pick ${token} 2026-08-04`);assert.equal((await h.get()).state.cycles.length,1);
  await h.click(`saveperiod ${token}`);assert.equal((await h.get()).state.cycles.length,2);
  await h.click(`saveperiod ${token}`);assert.equal((await h.get()).state.cycles.length,2);
});
test('record cards expose editing and reject stale concurrent edits',async()=>{
  const h=harness();await ready(h);await h.run('begin 2026-09-01');await h.run('end 2026-09-04');
  const id=(await h.get()).state.cycles[0].id;
  await h.click(`record ${id}`);assert.ok(buttons((await h.get()).state.outbox.at(-1).payload).some(b=>b.callback_data===`editrecord ${id}`));
  await h.click(`editrecord ${id}`);const token=(await h.get()).state.flow.token;
  await h.click(`pick ${token} 2026-09-02`);await h.click(`pick ${token} 2026-09-05`);
  await h.run(`edit ${id} 2026-09-01 2026-09-06`);await h.click(`saveperiod ${token}`);
  assert.equal((await h.get()).state.cycles[0].end_date,'2026-09-06');
});
test('symptom selection requires severity and saves specific date feedback',async()=>{
  const h=harness();await ready(h);await h.click('symptoms');await h.click('symptomselect cramps 2026-09-09');
  assert.equal((await h.get()).state.symptoms.length,0);
  assert.equal(buttons((await h.get()).state.outbox.at(-1).payload).filter(b=>b.callback_data.startsWith('symptom ')).length,3);
  await h.click('symptom cramps 3 2026-09-09');let a=await h.get();
  assert.equal(a.state.symptoms[0].severity,3);assert.match(a.state.outbox.at(-1).payload.text,/2026-09-09/);
  await h.click('symptomhistory');assert.ok(buttons((await h.get()).state.outbox.at(-1).payload).some(b=>b.callback_data==='symptomrecord cramps 2026-09-09'));
});
test('home presents only the applicable today action and active period summary',async()=>{
  const h=harness();await ready(h);let panel=home(await h.get(),NOW);
  assert.ok(buttons(panel).some(b=>b.callback_data==='begin today'));
  assert.ok(!buttons(panel).some(b=>b.callback_data==='end today'));
  await h.run('begin 2026-09-08');panel=home(await h.get(),NOW);
  assert.match(panel.text,/day 3/);assert.ok(buttons(panel).some(b=>b.callback_data==='end today'));
  assert.ok(!buttons(panel).some(b=>b.callback_data==='begin today'));
});
test('period and symptom history paginate beyond ten records',async()=>{
  const h=harness();await ready(h);const a=await h.get();
  a.state.cycles=Array.from({length:12},(_,i)=>({id:String(i),start_date:`2025-${String(i+1).padStart(2,'0')}-01`,end_date:`2025-${String(i+1).padStart(2,'0')}-04`}));
  a.state.symptoms=a.state.cycles.map(c=>({date:c.start_date,name:'cramps',severity:2}));
  for(const symptoms of [false,true]) {
    const panel=historyPanel(a,2,symptoms);assert.match(panel.text,/Page 3 of 3/);
    assert.equal(buttons(panel).filter(b=>b.callback_data.startsWith(symptoms?'symptomrecord ':'record ')).length,2);
  }
});
test('localized dates roundtrip in both calendars and Persian symptoms parse',()=>{
  for(const language of ['fa','en']) for(const calendar of ['gregorian','persian']) {
    const user={language,calendar};assert.equal(inputDate(displayDate('2026-03-21',user),user),'2026-03-21');
  }
  assert.equal(inputDate('۱۴۰۵/۰۱/۰۱',{calendar:'persian'}),'2026-03-21');
  assert.equal(inputDate('g:۲۰۲۶-۰۳-۲۱',{calendar:'persian'}),'2026-03-21');
  assert.equal(parse('symptom cramps ٣ ۲۰۲۶-۰۹-۰۹')[2],'3');
});
test('calendar includes weekdays and year navigation; reminders show eligibility',async()=>{
  const h=harness();await ready(h);const a=await h.get();
  const panel=calendar(a.state,'begin','2026-09-01','2026-09-10');
  assert.deepEqual(panel.reply_markup.inline_keyboard[0].map(b=>b.text),['Su','Mo','Tu','We','Th','Fr','Sa']);
  assert.ok(buttons(panel).some(b=>b.text==='Previous year'));
  a.state.reminder='12:00';assert.match(reminderPanel(a,NOW).text,/At least three/);
  a.state.cycles=[{start_date:'2026-09-01',end_date:null}];assert.match(reminderPanel(a,NOW).text,/Paused/);
});
test('partner joining requires explicit owner approval and starts private',async()=>{
  const h=harness();await ready(h);await h.run('partner');await h.run(`join ${(await h.get()).invitation}`,2);
  let a=await h.get();assert.equal(a.partner_id,null);assert.match(a.state.outbox.at(-2).payload.text,/ID 2/);
  const token=a.state.pendingJoin.token;await h.click(`cancel ${token}`);await h.click(`confirm ${token}`);
  assert.equal((await h.get()).partner_id,null);
  await connect(h);a=await h.get();assert.equal(a.partner_id,2);assert.ok(Object.values(a.state.sharing).every(v=>!v));
});
test('sharing toggles reflect state and old versions cannot change permissions',async()=>{
  const h=harness();await ready(h);await connect(h);let a=await h.get(),version=a.state.sharingVersion;
  await h.click(`share periods 1 ${version}`);a=await h.get();assert.equal(a.state.sharing.periods,true);
  assert.ok(buttons(a.state.outbox.at(-1).payload).some(b=>b.callback_data===`share periods 0 ${version+1}`));
  await h.click(`share periods 0 ${version}`);assert.equal((await h.get()).state.sharing.periods,true);
  await h.click(`share periods 0 ${version+1}`);assert.equal((await h.get()).state.sharing.periods,false);
});
test('historical symptom notices contain the changed date and severity',async()=>{
  const h=harness();await ready(h);await connect(h);await h.run('share symptoms 1');
  await h.store.mutate(1,a=>{a.state.outbox=[];},NOW);
  await h.run('symptom cramps 3 2026-09-01');await drain(h.db,h.api,class{},1,{now:NOW,limit:50});
  const notice=h.sent.find(m=>m.chat_id===2);assert.match(notice.text,/2026-09-01/);assert.match(notice.text,/3\/3/);
});
test('uneditable old Telegram panels recover with a fresh message',async()=>{
  const h=harness();await ready(h);await h.store.mutate(1,a=>{a.state.outbox=[];},NOW);
  await h.click('home');h.api.editMessageText=async()=>{throw {code:400,description:"Bad Request: message can't be edited"};};
  await drain(h.db,h.api,class{},1,{now:NOW});assert.equal(h.sent.length,1);assert.equal(h.sent[0].message_id,undefined);
  assert.equal((await h.get()).state.outbox.length,0);
});

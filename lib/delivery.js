import { Store, enqueue } from 'lib/store';
import { localClock, prediction, daysBetween, displayDate } from 'lib/dates';
import { t, message } from 'lib/messages';
import { predictionText } from 'lib/ui';

export function scheduleReminder(account,now) {
  const state=account.state;
  if(account.role!=='primary'||state.deletedAt||!state.reminder) return;
  const clock=localClock(new Date(now),state.timezone);
  if(clock.time<state.reminder||state.lastReminder===clock.date) return;
  const p=prediction(state.cycles);
  if(!p||p.active) return;
  const days=daysBetween(clock.date,p.date);
  if(![1,3,4,5].includes(days)) return;
  state.lastReminder=clock.date;
  const payload={method:'reminder',reminder:true,predictionDate:p.date,localDate:clock.date};
  enqueue(account,`reminder:${clock.date}`,account.id,payload,now,null,86400000);
  if(account.partner_id&&state.sharing.reminders) enqueue(account,`partner-reminder:${clock.date}`,account.partner_id,payload,now,'reminders',86400000);
}
async function render(store,account,item,now) {
  const recipient=await store.get(item.recipient),state=account.state;
  if(!recipient) return null;
  // A deletion receipt is the only permitted payload in the deleted aggregate.
  if(recipient.state.deletedAt && !(state.deletedAt&&item.recipient===account.id&&item.id.endsWith(':deleted'))) return null;
  const lang=recipient?.state.language??state.language;
  if(item.scope) {
    if(account.role!=='primary'||account.partner_id!==item.recipient||state.grant!==item.grant||recipient?.role!=='partner'||recipient.state.deletedAt) return null;
    if(item.scope!=='connection'&&!state.sharing[item.scope]) return null;
  }
  const p=item.payload;
  if(p.method==='notice') return message(t(p.key,lang));
  if(p.method==='reminder') {
    if(account.role!=='primary'||!state.reminder) return null;
    const clock=localClock(new Date(now),state.timezone),estimate=prediction(state.cycles);
    if(!estimate||estimate.active||estimate.date!==p.predictionDate||clock.date!==p.localDate) return null;
    return message(t(item.scope?'partnerReminder':'reminder',lang,{days:daysBetween(clock.date,estimate.date)}));
  }
  if(p.method==='status') {
    const user={...state,language:lang,calendar:recipient.state.calendar};
    if(p.scope==='periods') {
      const last=[...state.cycles].sort((a,b)=>b.start_date.localeCompare(a.start_date))[0];
      return message(last?t('periodStatus',lang,{start:displayDate(last.start_date,user),end:last.end_date?displayDate(last.end_date,user):t('active',lang)}):t('noHistory',lang));
    }
    if(p.scope==='reminders') return message(predictionText(state.cycles,user));
    const today=localClock(new Date(now),state.timezone).date;
    const symptoms=state.symptoms.filter(s=>s.date===today);
    return message(symptoms.length?symptoms.map(s=>`${t(s.name,lang)}: ${s.severity}/3`).join('\n'):t('noSymptoms',lang));
  }
  if(p.method==='export') {
    if(item.recipient!==account.id||state.deletedAt) return null;
    return {method:'export',data:{formatVersion:1,telegramId:account.id,role:account.role,
      language:state.language,calendar:state.calendar,timezone:state.timezone,reminder:state.reminder,
      sharing:state.sharing,partnerId:account.partner_id,cycles:state.cycles,symptoms:state.symptoms}};
  }
  return p;
}
export async function drain(db,api,InputFile,id,{now=Date.now(),limit=10}={}) {
  const store=new Store(db);
  let delivered=0;
  for(let i=0;i<limit;i++) {
    const lease=await store.token(); let selected=null;
    const claimed=await store.mutate(id,a=>{
      selected=a.state.outbox.find(item=>item.due<=now&&item.expires>now&&item.leaseUntil<=now);
      if(!selected) return false;
      selected.lease=lease; selected.leaseUntil=now+120000;
    },now);
    if(!claimed||!selected) break;
    // Read after claiming; disconnect/deletion may have removed the item in between.
    const current=await store.get(id);
    const item=current?.state.outbox.find(item=>item.id===selected.id&&item.lease===lease);
    if(!item) continue;
    const payload=await render(store,current,item,now);
    try {
      if(payload) {
        if(payload.method==='export') {
          // Encode without assuming the sandbox has Node Buffer or TextEncoder.
          const text=JSON.stringify(payload.data,null,2);
          const bytes=Uint8Array.from(unescape(encodeURIComponent(text)),c=>c.charCodeAt(0));
          await api.sendDocument({chat_id:item.recipient,document:new InputFile(bytes,'luna-export.json',{type:'application/json'})});
        } else {
          const {method,...params}=payload;
          await api[method]({chat_id:item.recipient,...params});
        }
        delivered++;
      }
      await store.mutate(id,a=>{a.state.outbox=a.state.outbox.filter(p=>p.id!==item.id||p.lease!==lease);},now);
    } catch(error) {
      const code=Number(error.code)||0;
      await store.mutate(id,a=>{
        const pending=a.state.outbox.find(p=>p.id===item.id&&p.lease===lease); if(!pending) return false;
        pending.attempts++;
        if([400,403].includes(code)||pending.attempts>=5) a.state.outbox=a.state.outbox.filter(p=>p!==pending);
        else { pending.lease=null; pending.leaseUntil=0; pending.due=now+Math.max(Number(error.parameters?.retry_after)||0,2**pending.attempts*30)*1000; }
      },now);
      console.warn('delivery_failed',{code}); // Never log Telegram errors, tokens, identifiers or health content.
    }
  }
  return delivered;
}

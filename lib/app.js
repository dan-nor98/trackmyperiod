import { Store, Conflict, initialState, enqueue, revoke, prune } from 'lib/store';
import { InputError, localClock, validatePeriod, validateTimezone } from 'lib/dates';
import { t, button, message, symptomNames } from 'lib/messages';
import { home, historyText, calendar } from 'lib/ui';

export function parse(text) {
  const match=/^\/?([a-z_]+)(?:@[A-Za-z0-9_]+)?(?:\s+(.*))?$/.exec(text.trim());
  return match?[match[1],...(match[2]?.split(/\s+/)??[])]:['help'];
}
function primary(account) { if(account.role!=='primary') throw new InputError('roleError'); }
function validateCycles(cycles,today) {
  const sorted=[...cycles].sort((a,b)=>a.start_date.localeCompare(b.start_date));
  for(let i=0;i<sorted.length;i++) {
    const c=sorted[i]; validatePeriod(c.start_date,c.end_date,today);
    if(i && (sorted[i-1].end_date===null || sorted[i-1].end_date>=c.start_date)) throw new InputError('overlap');
  }
}
async function apply(account,command,{store,api,now,key},confirmed=false) {
  const [cmd,...args]=parse(command),state=account.state,lang=state.language;
  const today=localClock(new Date(now),state.timezone).date;
  let replyIndex=0;
  const reply=payload=>enqueue(account,`${key}:reply:${replyIndex++}`,account.id,payload,now);
  const say=(name,values)=>reply(message(t(name,lang,values)));
  const confirm=async (next,label='confirm')=>{
    const token=(await store.token()).slice(0,24);
    state.confirmations[token]={command:next,expires:now+600000};
    reply(message(t(label,lang),[[button(t('yes',lang),`confirm ${token}`),button(t('cancel',lang),'home')]]));
  };
  const changed=scope=>{
    say('saved');
    if(account.partner_id && state.sharing[scope]) enqueue(account,`${key}:notice`,account.partner_id,
      {method:'notice',key:scope==='periods'?'periodChanged':'symptomChanged'},now,scope);
  };
  const snapshot=()=>{ state.undo={cycles:JSON.parse(JSON.stringify(state.cycles)),symptoms:JSON.parse(JSON.stringify(state.symptoms))}; };
  switch(cmd) {
    case 'noop': break;
    case 'start':
      if(args[0]) {
        if(!/^[a-f0-9]{48}$/.test(args[0])) throw new InputError('invalidInvite');
        reply(message(t('partnerRoleRequired',lang),[[button(t('partner',lang),`join ${args[0]}`)]]));
      } else {
        reply(message(t('welcome',lang),[[button('English','language en'),button('فارسی','language fa')]])); reply(home(account));
      } break;
    case 'home': reply(home(account)); break;
    case 'help': say('help'); break;
    case 'privacy': say('privacy'); break;
    case 'language':
      if(!['en','fa'].includes(args[0])) throw new InputError('help');
      state.language=args[0]; reply(home(account)); break;
    case 'role':
      if(!['primary','partner'].includes(args[0])) throw new InputError('help');
      if(account.role && account.role!==args[0] && !confirmed) { await confirm(command,'chooseRole'); break; }
      if(account.role!==args[0]) { revoke(account); account.role=args[0]; state.reminder=null; }
      reply(home(account)); break;
    case 'settings': reply(message(t('settingsHelp',lang),[
      [button('English','language en'),button('فارسی','language fa')],
      [button(t('gregorian',lang),'preference gregorian'),button(t('persian',lang),'preference persian')],
      [button(t('primary',lang),'role primary'),button(t('partner',lang),'role partner')]])); break;
    case 'preference':
      if(!['gregorian','persian'].includes(args[0])) throw new InputError('help');
      state.calendar=args[0]; say('settingSaved'); break;
    case 'timezone':
      if(args.length!==1) throw new InputError('timezoneError');
      state.timezone=validateTimezone(args[0]); say('settingSaved'); break;
    case 'reminders':
      primary(account);
      if(!args.length) { say('reminderHelp'); break; }
      if(args[0]!=='off' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(args[0])) throw new InputError('reminderHelp');
      state.reminder=args[0]==='off'?null:args[0];
      state.outbox=state.outbox.filter(item=>!item.payload.reminder);
      say('reminderSaved'); break;
    case 'track': primary(account); reply(message(t('track',lang),[
      [button(t('startToday',lang),'begin today'),button(t('endToday',lang),'end today')],
      [button(t('pickStart',lang),`calendar begin ${today}`),button(t('pickEnd',lang),`calendar end ${today}`)]])); break;
    case 'calendar':
      primary(account); if(!['begin','end'].includes(args[0])) throw new InputError('help');
      reply(calendar(state,args[0],args[1],today)); break;
    case 'begin': {
      primary(account); const date=args[0]==='today'?today:args[0]; validatePeriod(date,null,today);
      snapshot(); state.cycles.push({id:(await store.token()).slice(0,12),start_date:date,end_date:null});
      validateCycles(state.cycles,today); changed('periods'); break;
    }
    case 'end': {
      primary(account); const c=state.cycles.find(c=>c.end_date===null);
      if(!c) throw new InputError('noActive');
      const date=args[0]==='today'?today:args[0]; validatePeriod(c.start_date,date,today);
      snapshot(); c.end_date=date; validateCycles(state.cycles,today); changed('periods'); break;
    }
    case 'history': primary(account); reply(message(historyText(state.cycles,state))); break;
    case 'edit': {
      primary(account); if(args.length!==3) throw new InputError('historyHelp');
      const c=state.cycles.find(c=>c.id===args[0]); if(!c) throw new InputError('notFound');
      const end=args[2]==='-'?null:args[2]; validatePeriod(args[1],end,today);
      snapshot(); c.start_date=args[1]; c.end_date=end; validateCycles(state.cycles,today); changed('periods'); break;
    }
    case 'remove': {
      primary(account); const c=state.cycles.find(c=>c.id===args[0]); if(!c) throw new InputError('notFound');
      if(!confirmed) { await confirm(command); break; }
      snapshot(); state.cycles=state.cycles.filter(c=>c.id!==args[0]); changed('periods'); break;
    }
    case 'symptoms': primary(account); reply(message(t('symptomHelp',lang),
      symptomNames.map(name=>[button(t(name,lang),`symptom ${name} 1 ${today}`)]))); break;
    case 'symptom': case 'unsymptom': {
      primary(account); const name=args[0],severity=cmd==='symptom'?Number(args[1]):1;
      const date=(cmd==='symptom'?args[2]:args[1])??today;
      if(!symptomNames.includes(name)||![1,2,3].includes(severity)) throw new InputError('symptomError');
      validatePeriod(date,date,today); snapshot();
      state.symptoms=state.symptoms.filter(s=>s.date!==date||s.name!==name);
      if(cmd==='symptom') state.symptoms.push({date,name,severity}); changed('symptoms'); break;
    }
    case 'undo':
      primary(account); if(!state.undo) throw new InputError('noUndo');
      state.cycles=state.undo.cycles; state.symptoms=state.undo.symptoms; state.undo=null; say('undone'); break;
    case 'partner': {
      primary(account); if(account.partner_id) throw new InputError('alreadyConnected');
      const token=await store.token(); account.invitation=token; account.invitation_expires=now+600000;
      const me=await api.getMe(); say('invite',{link:`https://t.me/${me.username}?start=${token}`}); break;
    }
    case 'sharing':
      primary(account); if(!account.partner_id) throw new InputError('noPartner');
      say('sharingHelp'); reply(message(t('sharing',lang),['periods','symptoms','reminders'].map(scope=>[
        button(`${t(scope,lang)}: ${t(state.sharing[scope]?'on':'off',lang)}`,`share ${scope} ${state.sharing[scope]?0:1}`)]))); break;
    case 'share': {
      primary(account); const [scope,value]=args;
      if(!['periods','symptoms','reminders'].includes(scope)||!['0','1'].includes(value)) throw new InputError('help');
      if(!account.partner_id) throw new InputError('noPartner');
      state.sharing[scope]=value==='1';
      if(value==='0') state.outbox=state.outbox.filter(item=>item.scope!==scope);
      say('settingSaved'); break;
    }
    case 'disconnect': revoke(account); say('disconnected'); break;
    case 'export': reply({method:'export'}); break;
    case 'delete':
      if(!confirmed) { await confirm('delete','deleteWarning'); break; }
      revoke(account); account.role=null;
      account.state={...initialState(lang),processed:state.processed,deletedAt:now};
      enqueue(account,`${key}:deleted`,account.id,message(t('deleted',lang)),now); break;
    case 'confirm': {
      const action=state.confirmations[args[0]];
      if(!action || action.expires<=now) throw new InputError('expired');
      delete state.confirmations[args[0]];
      await apply(account,action.command,{store,api,now,key},true); break;
    }
    default: say('help');
  }
}

async function crossCommand(store,api,actor,command,key,now) {
  const [cmd,token]=parse(command),id=actor.id;
  if(cmd==='join' && actor.role==='primary') throw new InputError('partnerRoleRequired');
  // Persist a fixed target before crossing account boundaries. Retries cannot act on a new partner.
  actor=await store.mutate(id,async a=>{
    if(a.state.processed[key]) return false;
    a.state.intents??={}; if(a.state.intents[key]) return false;
    if(cmd==='join') {
      const rate=a.state.pairingRate??{since:now,count:0};
      if(rate.since<=now-600000) { rate.since=now; rate.count=0; }
      if(rate.count>=5) throw new InputError('rateLimit');
      rate.count++; a.state.pairingRate=rate;
      if(a.role===null) a.role='partner'; // Explicit support-role button, never silently replaces primary.
    }
    const owner=cmd==='join'?await store.invitation(token??'',now):await store.owner(id);
    a.state.intents[key]={target:owner?.id??null,grant:owner?.state.grant??null,token:cmd==='join'?token:null,created:now};
  },now);
  if(actor.state.processed[key]) return;
  const intent=actor.state.intents[key];
  if(!intent.target) throw new InputError(cmd==='join'?'invalidInvite':'noPartner');
  for(let attempt=0;attempt<8;attempt++) {
    actor=await store.get(id);
    const owner=await store.get(intent.target);
    if(!owner || owner.state.deletedAt) throw new InputError('noPartner');
    if(owner.state.processed[key]) break;
    if(cmd==='join') {
      if(actor.role!=='partner') throw new InputError('partnerRoleRequired');
      if(owner.role!=='primary'||owner.id===id||owner.invitation!==intent.token||owner.invitation_expires<=now) throw new InputError('invalidInvite');
      if(owner.partner_id || await store.owner(id)) throw new InputError('alreadyConnected');
      owner.partner_id=id; owner.invitation=null; owner.invitation_expires=null;
      owner.state.grant=await store.token(); owner.state.sharing={periods:false,symptoms:false,reminders:false};
      enqueue(owner,`${key}:owner`,owner.id,message(t('connected',owner.state.language)),now);
      enqueue(owner,`${key}:partner`,id,{method:'notice',key:'connected'},now,'connection');
    } else {
      if(owner.partner_id!==id || owner.state.grant!==intent.grant || actor.role!=='partner') throw new InputError('noPartner');
      if(cmd==='disconnect') {
        revoke(owner); enqueue(owner,`${key}:disconnected`,id,message(t('disconnected',actor.state.language)),now);
      } else {
        let count=0;
        for(const scope of ['periods','symptoms','reminders']) if(owner.state.sharing[scope]) {
          enqueue(owner,`${key}:status:${scope}`,id,{method:'status',scope},now,scope,600000); count++;
        }
        if(!count) enqueue(owner,`${key}:empty`,id,message(t('nothingShared',actor.state.language)),now,'connection');
      }
    }
    owner.state.processed[key]=now;
    try { await store.save(owner,now,actor); break; }
    catch(error) {
      if(error instanceof Conflict) { if(attempt===7) throw error; continue; }
      if(/UNIQUE/.test(error.message)) throw new InputError('alreadyConnected');
      throw error;
    }
  }
  await store.mutate(id,a=>{a.state.processed[key]=now; delete a.state.intents[key];},now);
  return intent.target;
}

export async function handleUpdate(update,{db,api,now=Date.now()}) {
  const callback=update.callback_query,msg=callback?.message??update.message,sender=callback?.from??msg?.from;
  if(!msg || !sender || msg.chat?.type!=='private'||msg.chat.id!==sender.id||sender.is_bot) return [];
  if(!Number.isSafeInteger(sender.id)||sender.id<=0||!Number.isSafeInteger(update.update_id)) return [];
  if(!Number.isFinite(msg.date)||now-msg.date*1000>7*86400000) return [];
  const command=callback?.data??msg.text??'/help'; if(typeof command!=='string'||command.length>2048) return [];
  const store=new Store(db),key=String(update.update_id),id=sender.id;
  let actor=await store.create(id,sender.language_code?.startsWith('fa')?'fa':'en',now);
  if(actor.state.processed[key]) return [id];
  const stale=callback && now-msg.date*1000>600000;
  const [cmd]=parse(command),targets=[id];
  const isCross=cmd==='join'||cmd==='status'||(cmd==='disconnect'&&actor.role==='partner');
  try {
    if(stale) throw new InputError('expired');
    if(actor.state.deletedAt && (cmd!=='start'||msg.date<=Math.floor(actor.state.deletedAt/1000))) return targets;
    if(isCross) {
      const target=await crossCommand(store,api,actor,command,key,now); if(target) targets.push(target);
    } else {
      // Remove an incoming grant before changing roles/recreating a deleted account.
      const effective=cmd==='confirm'?actor.state.confirmations[parse(command)[1]]?.command:command;
      if(cmd==='confirm' && actor.state.confirmations[parse(command)[1]]?.expires>now && effective && ['role','delete'].includes(parse(effective)[0])) {
        const owner=await store.owner(id);
        if(owner) await store.mutate(owner.id,a=>{if(a.partner_id===id) revoke(a);},now);
      }
      await store.mutate(id,async a=>{
        if(a.state.processed[key]) return false;
        prune(a,now);
        if(a.state.deletedAt) { const processed=a.state.processed; a.state=initialState(a.state.language); a.state.processed=processed; }
        await apply(a,command,{store,api,now,key}); a.state.processed[key]=now;
      },now);
    }
  } catch(error) {
    if(!(error instanceof InputError)) throw error;
    await store.mutate(id,a=>{
      if(a.state.processed[key]) return false;
      a.state.processed[key]=now;
      if(a.state.intents) delete a.state.intents[key];
      enqueue(a,`${key}:error`,id,message(t(error.message,a.state.language)),now);
    },now);
  }
  return targets;
}

import { Store, Conflict, initialState, enqueue, revoke, prune } from 'lib/store';
import { InputError, localClock, validatePeriod, validateTimezone, normalizeDigits, inputDate, displayDate } from 'lib/dates';
import { t, button, message, symptomNames } from 'lib/messages';
import { home, calendar, periodLabel, sharingPanel, reminderPanel, timezonePanel, setupPanel, identity } from 'lib/ui';
import { flowAction, currentFlow } from 'lib/flows';

export function parse(text) {
  text=normalizeDigits(text);
  for(const name of symptomNames) text=text.replace(t(name,'fa'),name);
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
async function apply(account,command,{store,api,now,key,callback=null},confirmed=false) {
  const [cmd,...args]=parse(command),state=account.state,lang=state.language;
  const today=localClock(new Date(now),state.timezone).date;
  let replyIndex=0;
  const reply=payload=>{
    if(callback) {state.uiFresh??={};state.uiFresh[callback.message.message_id]=now;}
    if(callback && replyIndex===0 && payload.method==='sendMessage') payload={...payload,method:'editMessageText',message_id:callback.message.message_id,reply_markup:payload.reply_markup??{inline_keyboard:[]}};
    enqueue(account,`${key}:reply:${replyIndex++}`,account.id,payload,now);
  };
  const say=(name,values)=>reply(message(t(name,lang,values)));
  const confirm=async (next,label='confirm',values={},record=null)=>{
    const token=(await store.token()).slice(0,24);
    state.confirmations[token]={command:next,expires:now+600000,record};
    reply(message(t(label,lang,values),[[button(t('yes',lang),`confirm ${token}`),button(t('cancel',lang),`cancel ${token}`)]]));
  };
  const changed=(scope,details={})=>{
    const text=details.period?t(details.removed?'removed':'periodSaved',lang,{period:periodLabel(details.period,state)}):details.symptom?t(details.removed?'symptomRemoved':'symptomSaved',lang,{name:t(details.symptom,lang),date:displayDate(details.date,state),severity:t(['mild','moderate','severe'][(details.severity??1)-1],lang)}):t('saved',lang);
    reply(message(text,[[button(t('homeButton',lang),'home'),button(t(scope==='periods'?'history':'symptomHistory',lang),scope==='periods'?'history':'symptomhistory')],[button('/undo','undo')]]));
    if(account.partner_id && state.sharing[scope]) enqueue(account,`${key}:notice`,account.partner_id,
      scope==='symptoms'&&details.date?{method:'symptomNotice',date:details.date}:{method:'notice',key:'periodChanged'},now,scope);
  };
  const snapshot=()=>{ state.undo={cycles:JSON.parse(JSON.stringify(state.cycles)),symptoms:JSON.parse(JSON.stringify(state.symptoms))}; };
  const dateInput=value=>callback?value:inputDate(value,state);
  if(!state.timezoneConfirmed && (['begin','end'].includes(cmd)&&args[0]==='today'||cmd==='symptoms'&&!args[0]||cmd==='reminders'&&args[0]!=='off')) {
    reply(timezonePanel(state));return;
  }
  if(await flowAction(account,cmd,args,{store,now,key,reply,say,snapshot,changed,primary,validateCycles,dateInput})) return;
  switch(cmd) {
    case 'noop': break;
    case 'start':
      if(args[0]) {
        if(!/^[a-f0-9]{48}$/.test(args[0])) throw new InputError('invalidInvite');
        state.pendingInvitation=args[0];
        if(!state.onboarded) { state.setup=true;reply(home(account,now));break; }
        const owner=await store.invitation(args[0],now);
        if(!owner) throw new InputError('invalidInvite');
        reply(message(t('joinReview',lang,{identity:identity(owner)}),[[button(t('yes',lang),`join ${args[0]}`)]]));
      } else {
        if(!state.onboarded) state.setup=true;
        reply(home(account,now));
      } break;
    case 'home': reply(home(account,now)); break;
    case 'help': reply(message(t('help',lang)+'\n'+t('datesHelp',lang))); break;
    case 'privacy': say('privacy'); break;
    case 'language':
      if(!['en','fa'].includes(args[0])) throw new InputError('help');
      state.language=args[0];state.languageChosen=true;
      if(!state.setup) reply(message(t('languageSaved',state.language)));
      reply(home(account,now)); break;
    case 'role':
      if(!['primary','partner'].includes(args[0])) throw new InputError('help');
      if(account.role && account.role!==args[0] && !confirmed) { await confirm(command,'roleReview',{role:t(args[0],lang)}); break; }
      if(account.role!==args[0]) { revoke(account); account.role=args[0]; state.reminder=null; }
      reply(home(account,now)); break;
    case 'settings': reply(message(t('settingsSummary',lang,{language:lang==='fa'?'فارسی':'English',calendar:t(state.calendar==='persian'?'persian':'gregorian',lang),zone:state.timezone})+'\n'+t('settingsHelp',lang),[
      [button('English','language en'),button('فارسی','language fa')],
      [button(t('gregorian',lang),'preference gregorian'),button(t('persian',lang),'preference persian')],
      [button(t('primary',lang),'role primary'),button(t('partner',lang),'role partner')],
      [button('Timezone / منطقه زمانی','timezone'),button(t('reminders',lang),'reminders')],
      [button(t('homeButton',lang),'home')]])); break;
    case 'preference':
      if(!['gregorian','persian'].includes(args[0])) throw new InputError('help');
      state.calendar=args[0];state.calendarChosen=true;
      if(state.setup) reply(home(account,now)); else say('calendarSaved',{calendar:t(args[0]==='persian'?'persian':'gregorian',lang)}); break;
    case 'timezone':
      if(!args.length) {reply(timezonePanel(state));break;}
      if(args.length!==1) throw new InputError('timezoneError');
      state.timezone=validateTimezone(args[0]);state.timezoneConfirmed=true;
      say('timezoneSaved',{zone:state.timezone,date:displayDate(localClock(new Date(now),state.timezone).date,state)});
      if(state.setup&&!setupPanel(account)) {state.setup=false;state.onboarded=true;}
      if(state.pendingInvitation&&state.onboarded) {
        const owner=await store.invitation(state.pendingInvitation,now);
        if(owner) reply(message(t('joinReview',lang,{identity:identity(owner)}),[[button(t('yes',lang),`join ${state.pendingInvitation}`)]]));
        else {delete state.pendingInvitation;say('invalidInvite');}
      } else reply(home(account,now)); break;
    case 'reminders':
      primary(account);
      if(!args.length) { reply(reminderPanel(account,now)); break; }
      if(args[0]!=='off' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(args[0])) throw new InputError('reminderHelp');
      state.reminder=args[0]==='off'?null:args[0];
      state.outbox=state.outbox.filter(item=>!item.payload.reminder);
      reply(reminderPanel(account,now)); break;
    case 'track': {
      primary(account);const active=state.cycles.some(c=>c.end_date===null);
      reply(message(t('track',lang),[
        [button(t(active?'endToday':'startToday',lang),active?'end today':'begin today')],
        [button(t('addPeriod',lang),'newperiod'),...(active?[button(t('pickEnd',lang),'endpicker')]:[])],
        [button(t('homeButton',lang),'home')]]));break;
    }
    case 'calendar':
      primary(account);
      if(args[0]?.startsWith('pick:')) currentFlow(state,args[0].slice(5),now);
      else if(!['begin','end'].includes(args[0])) throw new InputError('help');
      {const panel=calendar(state,args[0],args[1],today);
      if(args[0].startsWith('pick:')) {
        const flow=state.flow;
        if(flow.stage==='review') throw new InputError('expired');
        panel.text=t(flow.kind==='symptom'?'chooseSymptomDate':flow.stage==='end'?'endPrompt':'startPrompt',lang,{date:displayDate(flow.start,state)})+'\n'+panel.text;
        if(flow.stage==='end') panel.reply_markup.inline_keyboard.unshift([button(t('active',lang),`pick ${flow.token} ongoing`)]);
      }
      reply(panel);} break;
    case 'begin': {
      primary(account); const date=args[0]==='today'?today:dateInput(args[0]); validatePeriod(date,null,today);
      snapshot(); state.cycles.push({id:(await store.token()).slice(0,12),start_date:date,end_date:null});
      validateCycles(state.cycles,today); changed('periods',{period:state.cycles.at(-1)}); break;
    }
    case 'end': {
      primary(account); const c=state.cycles.find(c=>c.end_date===null);
      if(!c) throw new InputError('noActive');
      const date=args[0]==='today'?today:dateInput(args[0]); validatePeriod(c.start_date,date,today);
      snapshot(); c.end_date=date; validateCycles(state.cycles,today); changed('periods',{period:c}); break;
    }
    case 'edit': {
      primary(account); if(args.length!==3) throw new InputError('historyHelp');
      const c=state.cycles.find(c=>c.id===args[0]); if(!c) throw new InputError('notFound');
      const start=dateInput(args[1]),end=args[2]==='-'?null:dateInput(args[2]); validatePeriod(start,end,today);
      snapshot(); c.start_date=start; c.end_date=end; validateCycles(state.cycles,today); changed('periods',{period:c}); break;
    }
    case 'remove': {
      primary(account); const c=state.cycles.find(c=>c.id===args[0]); if(!c) throw new InputError('notFound');
      if(!confirmed) { await confirm(command,'removeReview',{period:periodLabel(c,state)},{...c}); break; }
      snapshot(); state.cycles=state.cycles.filter(c=>c.id!==args[0]); changed('periods',{period:c,removed:true}); break;
    }
    case 'symptom': case 'unsymptom': {
      primary(account); const name=args[0],severity=cmd==='symptom'?Number(args[1]):1;
      const input=(cmd==='symptom'?args[2]:args[1]);
      if(!input&&!state.timezoneConfirmed) {reply(timezonePanel(state));break;}
      const date=input?dateInput(input):today;
      if(!symptomNames.includes(name)||![1,2,3].includes(severity)) throw new InputError('symptomError');
      validatePeriod(date,date,today); snapshot();
      state.symptoms=state.symptoms.filter(s=>s.date!==date||s.name!==name);
      if(cmd==='symptom') state.symptoms.push({date,name,severity}); changed('symptoms',{symptom:name,date,severity,removed:cmd==='unsymptom'}); break;
    }
    case 'undo':
      primary(account); if(!state.undo) throw new InputError('noUndo');
      state.cycles=state.undo.cycles; state.symptoms=state.undo.symptoms; state.undo=null; say('undone'); break;
    case 'partner': {
      primary(account); if(account.partner_id) throw new InputError('alreadyConnected');
      revoke(account);
      const token=await store.token(); account.invitation=token; account.invitation_expires=now+600000;
      const me=await api.getMe(); say('invite',{link:`https://t.me/${me.username}?start=${token}`}); break;
    }
    case 'approve': {
      primary(account);
      const pending=state.pendingJoin;
      if(!confirmed||!pending||pending.token!==args[0]||pending.expires<=now) throw new InputError('expired');
      const partner=await store.get(pending.partnerId);
      if(!partner||partner.role!=='partner'||partner.state.deletedAt) throw new InputError('noPartner');
      if(account.partner_id||await store.owner(partner.id)) throw new InputError('alreadyConnected');
      account.guard=partner;account.partner_id=partner.id;state.grant=await store.token();
      state.sharing={periods:false,symptoms:false,reminders:false};state.sharingVersion=(state.sharingVersion??0)+1;
      delete state.pendingJoin;
      say('connectionApproved',{identity:identity(partner)});reply(sharingPanel(account));
      enqueue(account,`${key}:partner`,partner.id,message(t('connectionApproved',partner.state.language,{identity:identity(account)})),now,'connection');break;
    }
    case 'sharing':
      primary(account); if(!account.partner_id) throw new InputError('noPartner');
      reply(sharingPanel(account)); break;
    case 'share': {
      primary(account); const [scope,value]=args;
      if(!['periods','symptoms','reminders'].includes(scope)||!['0','1'].includes(value)) throw new InputError('help');
      if(!account.partner_id) throw new InputError('noPartner');
      if(callback&&Number(args[2])!==(state.sharingVersion??0)) {say('staleSharing');reply(sharingPanel(account));break;}
      state.sharing[scope]=value==='1';
      state.sharingVersion=(state.sharingVersion??0)+1;
      if(value==='0') state.outbox=state.outbox.filter(item=>item.scope!==scope);
      reply(sharingPanel(account)); break;
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
      if(action.record&&JSON.stringify(state.cycles.find(c=>c.id===action.record.id))!==JSON.stringify(action.record)) throw new InputError('staleRecord');
      delete state.confirmations[args[0]];
      await apply(account,action.command,{store,api,now,key,callback},true); break;
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
      owner.invitation=null; owner.invitation_expires=null;
      if(owner.state.pendingJoin) delete owner.state.confirmations[owner.state.pendingJoin.token];
      const approval=(await store.token()).slice(0,24);
      owner.state.pendingJoin={token:approval,partnerId:id,expires:now+600000};
      owner.state.confirmations[approval]={command:`approve ${approval}`,expires:now+600000};
      enqueue(owner,`${key}:owner`,owner.id,message(t('joinRequest',owner.state.language,{identity:identity(actor)}),[[button(t('yes',owner.state.language),`confirm ${approval}`),button(t('cancel',owner.state.language),`cancel ${approval}`)]]),now);
      enqueue(owner,`${key}:partner`,id,message(t('waitingApproval',actor.state.language,{identity:identity(owner)})),now);
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
  if(!Number.isFinite(msg.date)||(!callback&&now-msg.date*1000>7*86400000)) return [];
  const command=callback?.data??msg.text??'/help'; if(typeof command!=='string'||command.length>2048) return [];
  const store=new Store(db),key=String(update.update_id),id=sender.id;
  let actor=await store.create(id,sender.language_code?.startsWith('fa')?'fa':'en',now);
  if(actor.state.processed[key]) return [id];
  const profile={name:[sender.first_name,sender.last_name].filter(Boolean).join(' ').slice(0,128),username:sender.username??null};
  if(!actor.state.deletedAt&&JSON.stringify(actor.state.profile)!==JSON.stringify(profile)) actor=await store.mutate(id,a=>{if(a.state.deletedAt)return false;a.state.profile=profile;},now);
  const stale=callback && now-(actor.state.uiFresh?.[msg.message_id]??msg.date*1000)>600000;
  const [cmd]=parse(command),targets=[id];
  const isCross=cmd==='join'||cmd==='status'||(cmd==='disconnect'&&actor.role==='partner');
  try {
    if(stale&&['begin','end','symptom','unsymptom','undo','share','join'].includes(cmd)) throw new InputError('expired');
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
        await apply(a,command,{store,api,now,key,callback}); a.state.processed[key]=now;
      },now);
    }
  } catch(error) {
    if(/UNIQUE constraint failed: accounts.partner_id/.test(error.message??'')) error=new InputError('alreadyConnected');
    if(!(error instanceof InputError)) throw error;
    await store.mutate(id,a=>{
      if(a.state.processed[key]) return false;
      a.state.processed[key]=now;
      if(a.state.intents) delete a.state.intents[key];
      enqueue(a,`${key}:error`,id,message(t(error.message,a.state.language),[[button(t('homeButton',a.state.language),'home')]]),now);
    },now);
  }
  return targets;
}

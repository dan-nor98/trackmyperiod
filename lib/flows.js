import { InputError, displayDate, validatePeriod, validDate, localClock } from 'lib/dates';
import { t, button, message, symptomNames } from 'lib/messages';
import { calendar, periodLabel, historyPanel, home } from 'lib/ui';
import { enqueue } from 'lib/store';

export function currentFlow(state,token,now) {
  if(!state.flow||state.flow.token!==token||state.flow.expires<=now) throw new InputError('expired');
  return state.flow;
}
function severityPanel(state,name,date) {
  if(!symptomNames.includes(name)) throw new InputError('symptomError');
  return message(t('severityPrompt',state.language,{name:t(name,state.language),date:displayDate(date,state)}),
    [['mild','moderate','severe'].map((key,i)=>button(t(key,state.language),`symptom ${name} ${i+1} ${date}`)),
      [button(t('back',state.language),`symptoms ${date}`),button(t('homeButton',state.language),'home')]]);
}
export async function flowAction(account,cmd,args,ctx) {
  const {now,store,reply,say,snapshot,changed,primary,validateCycles}=ctx;
  const s=account.state,l=s.language,today=localClock(new Date(now),s.timezone).date;
  const dateInput=ctx.dateInput;
  switch(cmd) {
    case 'cancel':
      if(s.pendingJoin?.token===args[0]) {
        enqueue(account,`${ctx.key}:rejected`,s.pendingJoin.partnerId,message(t('connectionRejected',l)),now);
        delete s.pendingJoin;
      }
      delete s.confirmations[args[0]];
      if(s.flow?.token===args[0]) delete s.flow;
      say('cancelled'); reply(home(account,now)); return true;
    case 'history':case 'symptomhistory':
      primary(account); reply(historyPanel(account,args[0],cmd==='symptomhistory')); return true;
    case 'record': {
      primary(account); const record=s.cycles.find(c=>c.id===args[0]); if(!record) throw new InputError('notFound');
      reply(message(t('recordTitle',l,{period:periodLabel(record,s)}),[
        [button(t('editButton',l),`editrecord ${record.id}`),button(t('removeButton',l),`remove ${record.id}`)],
        [button(t('history',l),'history'),button(t('homeButton',l),'home')]])); return true;
    }
    case 'newperiod':case 'editrecord':case 'endpicker':case 'symptomday': {
      primary(account);
      const old=cmd==='editrecord'?s.cycles.find(c=>c.id===args[0]):cmd==='endpicker'?s.cycles.find(c=>c.end_date===null):null;
      if(['editrecord','endpicker'].includes(cmd)&&!old) throw new InputError('notFound');
      const token=(await store.token()).slice(0,16);
      s.flow={token,expires:now+600000,kind:cmd==='symptomday'?'symptom':'period',old:old?{...old}:null,
        stage:cmd==='endpicker'?'end':'start',start:cmd==='endpicker'?old.start_date:null};
      const panel=calendar(s,`pick:${token}`,old?.start_date??today,today);
      panel.text=t(cmd==='endpicker'?'endPrompt':'startPrompt',l,{date:displayDate(old?.start_date,s)})+'\n'+panel.text;
      if(cmd==='symptomday') panel.text=t('chooseSymptomDate',l)+'\n'+panel.text;
      if(cmd==='endpicker') panel.reply_markup.inline_keyboard.unshift([button(t('active',l),`pick ${token} ongoing`)]);
      reply(panel); return true;
    }
    case 'pick': {
      primary(account); const flow=currentFlow(s,args[0],now),date=args[1];
      if(date!=='ongoing'&&!validDate(date)) throw new InputError('dateError');
      if(flow.kind==='symptom') {
        validatePeriod(date,date,today); delete s.flow;
        reply(symptomsPanel(s,date)); return true;
      }
      if(flow.stage==='start') {
        validatePeriod(date,date,today); flow.start=date; flow.stage='end';
        const panel=calendar(s,`pick:${flow.token}`,date,today);
        panel.text=t('endPrompt',l,{date:displayDate(date,s)})+'\n'+panel.text;
        panel.reply_markup.inline_keyboard.unshift([button(t('active',l),`pick ${flow.token} ongoing`)]);
        reply(panel); return true;
      }
      if(flow.stage!=='end') throw new InputError('expired');
      flow.end=date==='ongoing'?null:date;
      validatePeriod(flow.start,flow.end,today); flow.stage='review';
      reply(message(t('periodReview',l,{period:periodLabel({start_date:flow.start,end_date:flow.end},s)}),[
        [button(t('yes',l),`saveperiod ${flow.token}`),button(t('cancel',l),`cancel ${flow.token}`)]])); return true;
    }
    case 'saveperiod': {
      primary(account); const flow=currentFlow(s,args[0],now);
      if(flow.kind!=='period'||flow.stage!=='review') throw new InputError('expired');
      if(flow.old&&JSON.stringify(s.cycles.find(c=>c.id===flow.old.id))!==JSON.stringify(flow.old)) throw new InputError('staleRecord');
      const record={id:flow.old?.id??(await store.token()).slice(0,12),start_date:flow.start,end_date:flow.end};
      snapshot(); s.cycles=s.cycles.filter(c=>c.id!==record.id).concat(record);
      validateCycles(s.cycles,today); delete s.flow;
      changed('periods',{period:record}); return true;
    }
    case 'symptoms':
      primary(account); reply(symptomsPanel(s,args[0]?dateInput(args[0]):today)); return true;
    case 'symptomselect':
      primary(account); {const date=dateInput(args[1]);validatePeriod(date,date,today);reply(severityPanel(s,args[0],date));} return true;
    case 'symptomrecord': {
      primary(account); const date=dateInput(args[1]),record=s.symptoms.find(c=>c.name===args[0]&&c.date===date);
      if(!record) throw new InputError('notFound');
      reply(message(t('symptomSaved',l,{name:t(record.name,l),severity:t(['mild','moderate','severe'][record.severity-1],l),date:displayDate(date,s)}),[
        [button(t('editSeverity',l),`symptomselect ${record.name} ${date}`),button(t('removeButton',l),`unsymptom ${record.name} ${date}`)],
        [button(t('symptomHistory',l),'symptomhistory')]])); return true;
    }
    default:return false;
  }
}
export function symptomsPanel(state,date) {
  const l=state.language;
  return message(`${t('symptomHelp',l)}\n${displayDate(date,state)}`,symptomNames.map(name=>[
    button(t(name,l),`symptomselect ${name} ${date}`)]).concat([
      [button(t('chooseSymptomDate',l),'symptomday'),button(t('symptomHistory',l),'symptomhistory')],
      [button(t('homeButton',l),'home')]]));
}

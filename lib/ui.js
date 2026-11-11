import { t, button, message } from 'lib/messages';
import { displayDate, calendarMonth, prediction, localClock, daysBetween, shiftMonths } from 'lib/dates';
export function periodLabel(c,user) { return `${displayDate(c.start_date,user)} — ${c.end_date?displayDate(c.end_date,user):t('active',user.language)}`; }
export function identity(account) {
  const profile=account.state.profile;
  return `${profile?.name??'Telegram'}${profile?.username?` (@${profile.username})`:''} · ID ${account.id}`;
}
export function timezonePanel(user,setup=false) {
  return message(t(setup?'setupTimezone':'timezonePrompt',user.language,{zone:user.timezone}),[
    [button('تهران · Asia/Tehran','timezone Asia/Tehran'),button('Berlin · Europe/Berlin','timezone Europe/Berlin')],
    [button('London · Europe/London','timezone Europe/London'),button('UTC','timezone UTC')]]);
}
export function setupPanel(account) {
  const s=account.state,l=s.language;
  if(!s.languageChosen) return message(t('setupLanguage',l),[[button('English','language en'),button('فارسی','language fa')]]);
  if(!account.role) return message(t('setupRole',l),[[button(t('primary',l),'role primary'),button(t('partner',l),'role partner')]]);
  if(!s.calendarChosen) return message(t('setupCalendar',l),[[button(t('gregorian',l),'preference gregorian'),button(t('persian',l),'preference persian')]]);
  if(!s.timezoneConfirmed) return timezonePanel(s,true);
  return null;
}
export function home(account,now=Date.now()) {
  const user=account.state,lang=user.language;
  if(user.setup) { const next=setupPanel(account); if(next) return next; }
  if(!account.role) return message(t('chooseRole',lang),[[button(t('primary',lang),'role primary'),button(t('partner',lang),'role partner')]]);
  const active=user.cycles.find(c=>c.end_date===null);
  const summary=active?t('activeSummary',lang,{date:displayDate(active.start_date,user),day:daysBetween(active.start_date,localClock(new Date(now),user.timezone).date)+1}):t('idleSummary',lang);
  return message(`${account.role==='primary'?summary+'\n':''}${t('home',lang,{zone:user.timezone})}`,account.role==='primary'?
    [[button(t(active?'endToday':'startToday',lang),active?'end today':'begin today')],
    [button(t('track',lang),'track'),button(t('addPeriod',lang),'newperiod')],
    [button(t('symptoms',lang),'symptoms'),button(t('history',lang),'history')],
    [button(t(account.partner_id?'sharing':'partner',lang),account.partner_id?'sharing':'partner'),button(t('settings',lang),'settings')]]:
    [[button(t('status',lang),'status'),button(t('settings',lang),'settings')]]);
}
export function historyText(cycles,user) {
  if(!cycles.length) return t('noHistory',user.language);
  const lines=[...cycles].sort((a,b)=>b.start_date.localeCompare(a.start_date)).slice(0,10).map(c=>
    `${c.id}: ${displayDate(c.start_date,user)} — ${c.end_date?displayDate(c.end_date,user):t('active',user.language)}`);
  lines.push(predictionText(cycles,user)); lines.push(t('historyHelp',user.language));
  return lines.join('\n\n');
}
export function predictionText(cycles,user) {
  const p=prediction(cycles);
  return p?t('prediction',user.language,{date:displayDate(p.date,user),early:displayDate(p.earliest,user),late:displayDate(p.latest,user),count:p.intervals}):t('insufficient',user.language);
}
export function calendar(user,type,anchor,today) {
  const month=calendarMonth(anchor,user.calendar),lang=user.language,rows=[];
  const weekday=new Date(`${month.dates[0]}T12:00:00Z`).getUTCDay();
  const headers=user.calendar==='persian'?(lang==='fa'?['ش','ی','د','س','چ','پ','ج']:['Sa','Su','Mo','Tu','We','Th','Fr']):(lang==='fa'?['ی','د','س','چ','پ','ج','ش']:['Su','Mo','Tu','We','Th','Fr','Sa']);
  rows.push(headers.map(h=>button(h,'noop')));
  let row=Array((weekday+(user.calendar==='persian'?1:0))%7).fill(button('·','noop'));
  for(const date of month.dates) {
    const text=new Intl.DateTimeFormat(lang==='fa'?'fa':'en',{calendar:user.calendar==='persian'?'persian':'gregory',timeZone:'UTC',day:'numeric'}).format(new Date(`${date}T12:00:00Z`));
    row.push(button(date>today?'·':text,date>today?'noop':`${type.replace(':',' ')} ${date}`));
    if(row.length===7) { rows.push(row); row=[]; }
  }
  if(row.length) rows.push(row);
  rows.push([button(t('prev',lang),`calendar ${type} ${month.previous}`),button(t('next',lang),`calendar ${type} ${month.next}`)]);
  rows.push([button(t('previousYear',lang),`calendar ${type} ${shiftMonths(anchor,user.calendar,-12)}`),button(t('nextYear',lang),`calendar ${type} ${shiftMonths(anchor,user.calendar,12)}`)]);
  rows.push([button(t('thisMonth',lang),`calendar ${type} ${today}`),button(t('homeButton',lang),'home')]);
  const title=new Intl.DateTimeFormat(lang==='fa'?'fa':'en',{calendar:user.calendar==='persian'?'persian':'gregory',timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(`${anchor}T12:00:00Z`));
  return message(`${t('selectDate',lang)}\n${title}`,rows);
}
export function sharingPanel(account) {
  const s=account.state,l=s.language,version=s.sharingVersion??0;
  return {...message(t('sharingHelp',l),['periods','symptoms','reminders'].map(scope=>[
    button(`${t(scope,l)}: ${t(s.sharing[scope]?'on':'off',l)}`,`share ${scope} ${s.sharing[scope]?0:1} ${version}`)]).concat([[button(t('homeButton',l),'home')]])),view:'sharing'};
}
export function historyPanel(account,page=0,symptoms=false) {
  const s=account.state,l=s.language;
  const records=[...(symptoms?s.symptoms:s.cycles)].sort((a,b)=>(b.date??b.start_date).localeCompare(a.date??a.start_date));
  const pages=Math.max(1,Math.ceil(records.length/5)),index=Math.min(Math.max(Number(page)||0,0),pages-1);
  const entries=records.slice(index*5,index*5+5);
  const lines=entries.map(c=>symptoms?`${displayDate(c.date,s)} · ${t(c.name,l)} · ${t(['mild','moderate','severe'][c.severity-1],l)}`:periodLabel(c,s));
  const rows=entries.map(c=>[button(symptoms?`${displayDate(c.date,s)} · ${t(c.name,l)}`:periodLabel(c,s),symptoms?`symptomrecord ${c.name} ${c.date}`:`record ${c.id}`)]);
  const navigation=[];
  if(index>0) navigation.push(button(t('prev',l),`${symptoms?'symptomhistory':'history'} ${index-1}`));
  if(index+1<pages) navigation.push(button(t('next',l),`${symptoms?'symptomhistory':'history'} ${index+1}`));
  if(navigation.length) rows.push(navigation);
  rows.push([button(t(symptoms?'history':'symptomHistory',l),symptoms?'history':'symptomhistory'),button(t('homeButton',l),'home')]);
  return message(`${t(symptoms?'symptomHistory':'history',l)}\n${lines.join('\n')||t(symptoms?'noSymptomHistory':'noHistory',l)}\n${t('page',l,{page:index+1,pages})}${symptoms?'':'\n\n'+predictionText(s.cycles,s)}`,rows);
}
export function reminderPanel(account,now) {
  const s=account.state,l=s.language,p=prediction(s.cycles),today=localClock(new Date(now),s.timezone).date;
  const reason=!s.reminder?t('reminderOff',l):s.cycles.some(c=>c.end_date===null)?t('reminderActive',l):!p?t('reminderFew',l,{count:s.cycles.length}):p.date<today?t('reminderPast',l):t('reminderReady',l,{date:displayDate(p.date,s)});
  return message(`${t('reminderSummary',l,{status:t(s.reminder?'on':'off',l),time:s.reminder??'—',zone:s.timezone,reason})}\n${t('reminderHelp',l)}`,
    [[button('08:00','reminders 08:00'),button('12:00','reminders 12:00'),button('20:00','reminders 20:00')],
    [button(t('offButton',l),'reminders off'),button(t('settings',l),'settings')]]);
}

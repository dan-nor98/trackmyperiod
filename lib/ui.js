import { t, button, message } from 'lib/messages';
import { displayDate, calendarMonth, prediction } from 'lib/dates';
export function home(account) {
  const user=account.state,lang=user.language;
  if(!account.role) return message(t('chooseRole',lang),[[button(t('primary',lang),'role primary'),button(t('partner',lang),'role partner')]]);
  return message(t('home',lang,{zone:user.timezone}),account.role==='primary'?
    [[button(t('startToday',lang),'begin today'),button(t('endToday',lang),'end today')],
    [button(t('symptoms',lang),'symptoms'),button(t('history',lang),'history')],
    [button(t('sharing',lang),'sharing'),button(t('settings',lang),'settings')]]:
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
  let row=Array((weekday+(user.calendar==='persian'?1:0))%7).fill(button('·','noop'));
  for(const date of month.dates) {
    const text=new Intl.DateTimeFormat(lang==='fa'?'fa':'en',{calendar:user.calendar==='persian'?'persian':'gregory',timeZone:'UTC',day:'numeric'}).format(new Date(`${date}T12:00:00Z`));
    row.push(button(date>today?'·':text,date>today?'noop':`${type} ${date}`));
    if(row.length===7) { rows.push(row); row=[]; }
  }
  if(row.length) rows.push(row);
  rows.push([button(t('prev',lang),`calendar ${type} ${month.previous}`),button(t('next',lang),`calendar ${type} ${month.next}`)]);
  return message(`${t('selectDate',lang)}\n${displayDate(month.dates[0],user)}`,rows);
}

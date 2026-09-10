const DAY = 86400000;
export class InputError extends Error {}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0,10) === value;
}
export function addDays(date, days) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY).toISOString().slice(0,10);
}
export function daysBetween(a,b) { return Math.round((Date.parse(b)-Date.parse(a))/DAY); }
export function localClock(now, timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(now).map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
}
export function validateTimezone(zone) {
  try { new Intl.DateTimeFormat('en',{timeZone:zone}).format(); return zone; }
  catch { throw new InputError('timezoneError'); }
}
export function validatePeriod(start,end,today) {
  if (!validDate(start) || (end !== null && !validDate(end))) throw new InputError('dateError');
  if (start>today || (end && end>today)) throw new InputError('futureError');
  if (end && end<start) throw new InputError('orderError');
}
export function displayDate(date,user) {
  if (!date) return '—';
  return new Intl.DateTimeFormat(user.language==='fa'?'fa-IR':'en-CA',{
    calendar:user.calendar==='persian'?'persian':'gregory',timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(new Date(`${date}T12:00:00Z`));
}
function calendarParts(iso,calendar) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-u-nu-latn',{
    calendar:calendar==='persian'?'persian':'gregory',timeZone:'UTC',year:'numeric',month:'numeric',day:'numeric'
  }).formatToParts(new Date(`${iso}T12:00:00Z`)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
}
export function calendarMonth(anchor,calendar) {
  if (!validDate(anchor)) throw new InputError('dateError');
  const first=addDays(anchor,1-calendarParts(anchor,calendar).day);
  const month=calendarParts(first,calendar).month;
  const dates=[];
  for(let i=0;i<32;i++) { const d=addDays(first,i); if(calendarParts(d,calendar).month!==month) break; dates.push(d); }
  return {dates,previous:addDays(first,-1),next:addDays(first,dates.length)};
}
export function prediction(cycles) {
  const recent=[...cycles].sort((a,b)=>a.start_date.localeCompare(b.start_date)).slice(-7);
  if(recent.length<3) return null; // At least two observed start-to-start intervals.
  const gaps=recent.slice(1).map((c,i)=>daysBetween(recent[i].start_date,c.start_date));
  const average=Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length);
  const last=recent.at(-1).start_date;
  return {date:addDays(last,average),earliest:addDays(last,Math.min(...gaps)),
    latest:addDays(last,Math.max(...gaps)),average,intervals:gaps.length,
    active:recent.at(-1).end_date===null};
}

import { db } from 'sdk';
import { initialState } from 'lib/store';
import { validatePeriod, localClock } from 'lib/dates';
import { symptomNames } from 'lib/messages';

// CLI-only: no public handler calls this module. Inserts new accounts only.
export default async function(input) {
  if(!input||!Array.isArray(input.accounts)||input.accounts.length>50) throw new Error('Supply at most 50 accounts');
  const today=localClock(new Date(),'UTC').date;
  const prepared=input.accounts.map(a=>{
    if(!Number.isSafeInteger(a.id)||a.id<=0||![null,'primary','partner'].includes(a.role)) throw new Error('Invalid legacy identity/role');
    const state=initialState(a.language==='fa'?'fa':'en');
    state.calendar=a.calendar==='persian'?'persian':'gregorian';
    state.cycles=[...a.cycles].sort((a,b)=>a.start_date.localeCompare(b.start_date));
    const ids=new Set();
    state.cycles.forEach((c,i)=>{
      if(typeof c.id!=='string'||!/^[a-zA-Z0-9_-]{1,32}$/.test(c.id)||ids.has(c.id)) throw new Error('Invalid legacy cycle ID');
      ids.add(c.id); validatePeriod(c.start_date,c.end_date,today);
      if(i && (state.cycles[i-1].end_date===null||state.cycles[i-1].end_date>=c.start_date)) throw new Error('Legacy periods overlap; correct before importing');
    });
    const symptoms=new Map();
    for(const s of a.symptoms) {
      validatePeriod(s.date,s.date,today);
      if(!symptomNames.includes(s.name)||![1,2,3].includes(s.severity)) throw new Error('Invalid legacy symptom');
      symptoms.set(`${s.date}:${s.name}`,{date:s.date,name:s.name,severity:s.severity});
    }
    state.symptoms=[...symptoms.values()];
    const document=JSON.stringify(state);
    if(document.length>900000) throw new Error('Legacy account exceeds import size limit');
    return {id:a.id,role:a.role,document};
  });
  let inserted=0;
  for(const a of prepared) {
    const result=await db.run(`INSERT INTO accounts(id,role,document,updated_at) VALUES(:id,:role,:doc,:now)
      ON CONFLICT(id) DO NOTHING RETURNING id`,{':id':a.id,':role':a.role,':doc':a.document,':now':Date.now()});
    inserted+=result.rows.length;
  }
  return {inserted,skipped:prepared.length-inserted};
}

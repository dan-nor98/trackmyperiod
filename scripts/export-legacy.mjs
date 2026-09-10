import { DatabaseSync } from 'node:sqlite';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [source,destination]=process.argv.slice(2);
if(!source||!destination) throw new Error('Usage: node scripts/export-legacy.mjs /path/luna.db /path/exports');
const db=new DatabaseSync(resolve(source),{readOnly:true});
const users=db.prepare('SELECT telegram_id,role,language,calendar_preference FROM users').all();
const cycles=db.prepare('SELECT id,start_date,end_date FROM cycles WHERE user_id=? ORDER BY start_date');
const symptoms=db.prepare('SELECT s.logged_at,s.symptom_name FROM symptoms s JOIN cycles c ON c.id=s.cycle_id WHERE c.user_id=?');
const accounts=users.map(u=>({id:u.telegram_id,role:u.role,language:u.language,calendar:u.calendar_preference==='shamsi'?'persian':'gregorian',
  cycles:cycles.all(u.telegram_id).map(c=>({id:`legacy${c.id}`,start_date:c.start_date,end_date:c.end_date})),
  symptoms:symptoms.all(u.telegram_id).map(s=>({date:s.logged_at,name:s.symptom_name,severity:1}))}));
const orphans=db.prepare('SELECT COUNT(*) AS n FROM symptoms s LEFT JOIN cycles c ON c.id=s.cycle_id WHERE c.id IS NULL').get().n;
if(orphans) throw new Error(`${orphans} orphan symptoms require manual ownership recovery before export`);
await mkdir(resolve(destination),{recursive:true,mode:0o700});
for(let i=0;i<accounts.length;i+=50) await writeFile(resolve(destination,`legacy-${i/50+1}.json`),JSON.stringify({accounts:accounts.slice(i,i+50)}),{mode:0o600,flag:'wx'});
db.close();
console.log(`Exported ${accounts.length} accounts into batches. No database changes. Pairings and reminders require fresh setup.`);

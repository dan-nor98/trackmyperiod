import { db, InputFile } from 'sdk';
import { calendarMonth, localClock } from 'lib/dates';

// Explicit remote compatibility check after migrating a TEST bot. Sends no messages.
export default async function() {
  if(typeof InputFile!=='function') throw new Error('SDK InputFile unavailable');
  const calendar=calendarMonth('2025-03-15','persian');
  if(calendar.next!=='2025-03-21') throw new Error('Persian Intl calendar unavailable');
  if(localClock(new Date('2026-09-10T22:00:00Z'),'Asia/Tehran').date!=='2026-09-11') throw new Error('IANA timezones unavailable');
  const probe=await db.get("SELECT length(hex(randomblob(24))) AS token_length, json_valid('{}') AS valid_json");
  if(probe.token_length!==48||probe.valid_json!==1) throw new Error('SQLite capabilities unavailable');
  await db.run("INSERT INTO jobs(name,cursor) VALUES('smoke',0) ON CONFLICT(name) DO NOTHING");
  const result=await db.run("UPDATE jobs SET cursor=cursor+1 WHERE name='smoke' RETURNING cursor");
  if(!result.rows?.length) throw new Error('Raw SQL RETURNING result shape differs from documented SDK');
  await db.run("DELETE FROM jobs WHERE name='smoke'");
  return {ok:true,checks:['InputFile','Intl Persian','IANA timezone','SQLite JSON','randomblob','RETURNING']};
}

import { db, api, InputFile } from 'sdk';
import { Store, unpack, prune, revoke } from 'lib/store';
import { scheduleReminder, drain } from 'lib/delivery';

// Invoked by an authenticated tgcloud run, never registered as a public bot command.
// Telegram's published Serverless SDK does not advertise a native timer trigger.
export default async function() {
  const now=Date.now(),store=new Store(db);
  const cursor=(await db.get("SELECT cursor FROM jobs WHERE name='maintenance'"))?.cursor??0;
  const rows=await db.all('SELECT * FROM accounts WHERE id>:cursor ORDER BY id LIMIT 50',{':cursor':cursor});
  let delivered=0;
  for(const row of rows) {
    const account=unpack(row);
    if(account.state.deletedAt && account.state.deletedAt<now-7*86400000) {
      await db.run('DELETE FROM accounts WHERE id=:id AND revision=:revision', {':id':account.id,':revision':account.revision}); continue;
    }
    await store.mutate(account.id,async a=>{
      prune(a,now);
      if(a.partner_id) {
        const partner=await store.get(a.partner_id);
        if(!partner||partner.role!=='partner'||partner.state.deletedAt) revoke(a);
      }
      a.state.intents=Object.fromEntries(Object.entries(a.state.intents??{}).filter(([,intent])=>intent.created>now-7*86400000));
      scheduleReminder(a,now);
    },now);
    delivered+=await drain(db,api,InputFile,account.id,{now,limit:5});
  }
  const next=rows.length===50?rows.at(-1).id:0;
  await db.run("INSERT INTO jobs(name,cursor) VALUES('maintenance',:cursor) ON CONFLICT(name) DO UPDATE SET cursor=excluded.cursor",{':cursor':next});
  return {scanned:rows.length,delivered,hasMore:next!==0};
}

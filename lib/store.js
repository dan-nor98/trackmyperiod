export class Conflict extends Error {}
export function initialState(language='en') {
  return {language,calendar:'gregorian',timezone:'UTC',reminder:null,cycles:[],symptoms:[],
    sharing:{periods:false,symptoms:false,reminders:false},grant:null,
    processed:{},outbox:[],confirmations:{},undo:null,lastReminder:null};
}
export function unpack(row) { return row ? {...row,state:JSON.parse(row.document)} : null; }
export class Store {
  constructor(db) { this.db=db; }
  async get(id) { return unpack(await this.db.get('SELECT * FROM accounts WHERE id=:id',{':id':id})); }
  async create(id,language,now) {
    await this.db.run(`INSERT INTO accounts(id,document,updated_at) VALUES(:id,:doc,:now)
      ON CONFLICT(id) DO NOTHING`,{':id':id,':doc':JSON.stringify(initialState(language)),':now':now});
    return this.get(id);
  }
  async owner(partnerId) { return unpack(await this.db.get('SELECT * FROM accounts WHERE partner_id=:id',{':id':partnerId})); }
  async invitation(token,now) {
    return unpack(await this.db.get('SELECT * FROM accounts WHERE invitation=:token AND invitation_expires>:now',{
      ':token':token,':now':now}));
  }
  async token() {
    // 192-bit opaque token from SQLite's native PRNG; no Math.random or unsupported crypto globals.
    return (await this.db.get('SELECT lower(hex(randomblob(24))) AS token')).token;
  }
  async save(account,now,guard) {
    const document=JSON.stringify(account.state);
    if(document.length>1000000) throw new Error('Account capacity exceeded; export and contact operator');
    const params={':id':account.id,':revision':account.revision,':role':account.role,
      ':partner':account.partner_id,':invitation':account.invitation,':expires':account.invitation_expires,
      ':document':document,':now':now};
    let extra='';
    if(guard) {
      extra=" AND EXISTS(SELECT 1 FROM accounts actor WHERE actor.id=:actor AND actor.revision=:actorRevision AND actor.role='partner')";
      params[':actor']=guard.id; params[':actorRevision']=guard.revision;
    }
    const result=await this.db.run(`UPDATE accounts SET revision=revision+1,role=:role,partner_id=:partner,
      invitation=:invitation,invitation_expires=:expires,document=:document,updated_at=:now
      WHERE id=:id AND revision=:revision${extra} RETURNING revision`,params);
    if(!result.rows?.length) throw new Conflict('Account revision changed');
    account.revision=result.rows[0].revision;
  }
  async mutate(id,fn,now) {
    for(let attempt=0;attempt<8;attempt++) {
      const account=await this.get(id); if(!account) return null;
      const result=await fn(account);
      if(result===false) return account;
      try { await this.save(account,now); return account; }
      catch(error) { if(!(error instanceof Conflict)) throw error; }
    }
    throw new Conflict('Retry budget exhausted');
  }
}
export function enqueue(account,id,recipient,payload,now,scope=null,ttl=86400000) {
  if(account.state.outbox.some(item=>item.id===id)) return;
  account.state.outbox.push({id,recipient,payload,scope,grant:scope?account.state.grant:null,
    due:now,expires:now+ttl,attempts:0,lease:null,leaseUntil:0});
}
export function revoke(account) {
  account.partner_id=null; account.invitation=null; account.invitation_expires=null;
  account.state.grant=null;
  account.state.sharing={periods:false,symptoms:false,reminders:false};
  account.state.outbox=account.state.outbox.filter(item=>!item.scope);
}
export function prune(account,now) {
  account.state.processed=Object.fromEntries(Object.entries(account.state.processed).filter(([,time])=>time>now-7*86400000));
  account.state.confirmations=Object.fromEntries(Object.entries(account.state.confirmations).filter(([,action])=>action.expires>now));
  account.state.outbox=account.state.outbox.filter(item=>item.expires>now);
  if(account.invitation_expires<=now) { account.invitation=null; account.invitation_expires=null; }
}

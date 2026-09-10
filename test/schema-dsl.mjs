// Local schema compiler for real SQLite tests; remote SDK compatibility is a separate smoke gate.
function column(name,type) {
  return {name,type,clauses:[],primaryKey(){this.clauses.push('PRIMARY KEY');return this;},
    notNull(){this.clauses.push('NOT NULL');return this;},unique(){this.clauses.push('UNIQUE');return this;},
    default(value){this.clauses.push(`DEFAULT ${typeof value==='number'?value:JSON.stringify(value)}`);return this;}};
}
export const integer=name=>column(name,'INTEGER');
export const text=name=>column(name,'TEXT');
export const sql=(strings,...args)=>strings.reduce((out,s,i)=>out+s+(args[i]?.name??args[i]??''),'');
export const check=(name,expression)=>({kind:'check',name,expression});
export const index=name=>({kind:'index',name,on(...columns){this.columns=columns;return this;}});
export function table(name,columns,extras) { return {name,columns,extras:extras?.(columns)??{}}; }
export function ddl(t) {
  const fields=Object.values(t.columns).map(c=>`${c.name} ${c.type} ${c.clauses.join(' ')}`);
  const extras=Object.values(t.extras);
  fields.push(...extras.filter(e=>e.kind==='check').map(e=>`CONSTRAINT ${e.name} CHECK(${e.expression})`));
  return `CREATE TABLE ${t.name} (${fields.join(',')});`+extras.filter(e=>e.kind==='index').map(e=>`CREATE INDEX ${e.name} ON ${t.name}(${e.columns.map(c=>c.name).join(',')});`).join('');
}

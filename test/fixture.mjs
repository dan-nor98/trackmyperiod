import { DatabaseSync } from 'node:sqlite';
import * as schema from '../schema.js';
import { ddl } from './schema-dsl.mjs';
export function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=OFF;');
  for(const table of Object.values(schema)) sqlite.exec(ddl(table));
  const db={
    async get(query,params={}) { return sqlite.prepare(query).get(params)??null; },
    async all(query,params={}) { return sqlite.prepare(query).all(params); },
    async run(query,params={}) {
      const statement=sqlite.prepare(query);
      if(/\bRETURNING\b/i.test(query)) { const rows=statement.all(params);return {rows,rowsAffected:rows.length}; }
      const result=statement.run(params); return {rows:[],rowsAffected:result.changes,lastInsertRowid:result.lastInsertRowid};
    }
  };
  const sent=[];
  const api={async getMe(){return {username:'test_luna_bot'};},async sendMessage(p){sent.push(p);return {};},
    async sendDocument(p){sent.push(p);return {};}};
  return {db,api,sent,sqlite};
}
export const NOW=Date.parse('2026-09-10T10:00:00Z');
export function update(id,user,text,extra={}) {
  return {update_id:id,message:{message_id:id,date:NOW/1000,chat:{id:user,type:'private'},from:{id:user,language_code:'en'},text,...extra}};
}

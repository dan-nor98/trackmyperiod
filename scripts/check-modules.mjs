import { readdir,readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files=['schema.js'];
async function walk(dir) { for(const e of await readdir(dir,{withFileTypes:true})) {const path=`${dir}/${e.name}`;if(e.isDirectory()) await walk(path);else if(path.endsWith('.js')) files.push(path);} }
await walk('lib'); await walk('handlers');
const names=new Set(files.map(p=>p.slice(0,-3)));
for(const path of files) {
  const source=await readFile(path,'utf8');
  for(const [,name] of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)) {
    if(!['sdk','sdk/db','sdk/api','sdk/fetch'].includes(name)&&!names.has(name)) throw new Error(`${path}: unsupported import ${name}`);
  }
  if(/\b(?:setInterval|setTimeout|process\.env|require\s*\(|Buffer\.)/.test(source)) throw new Error(`${path}: Node/timer dependency in runtime code`);
  const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
  if(result.status!==0) throw new Error(result.stderr);
}
console.log(`Checked ${files.length} native modules: syntax and allowed imports.`);

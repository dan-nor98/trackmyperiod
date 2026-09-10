import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const file=process.argv[2];
if(!file) throw new Error('Usage: node scripts/import-legacy.mjs exports/legacy-1.json');
const payload=JSON.stringify(JSON.parse(await readFile(file,'utf8')));
const result=spawnSync(process.execPath,['node_modules/@tgcloud/cli/bin/tgcloud.js','run','lib/import-legacy',payload],{stdio:'inherit'});
process.exitCode=result.status??1;

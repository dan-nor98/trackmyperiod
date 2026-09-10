import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
registerHooks({resolve(specifier,context,nextResolve) {
  if(specifier==='schema'||specifier.startsWith('lib/')) return {url:pathToFileURL(resolve(`${specifier}.js`)).href,shortCircuit:true};
  if(specifier==='sdk/db') return {url:pathToFileURL(resolve('test/schema-dsl.mjs')).href,shortCircuit:true};
  if(specifier==='sdk') return {url:pathToFileURL(resolve('test/sdk.mjs')).href,shortCircuit:true};
  return nextResolve(specifier,context);
}});

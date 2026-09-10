let runtime;
export function useRuntime(value) { runtime=value; }
export const db=new Proxy({}, {get:(_,key)=>(...args)=>runtime.db[key](...args)});
export const api=new Proxy({}, {get:(_,key)=>(...args)=>runtime.api[key](...args)});
export class InputFile { constructor(bytes,name,options){this.bytes=bytes;this.name=name;this.options=options;} }

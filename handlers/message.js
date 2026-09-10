import { dispatch } from 'lib/runtime';
export default async function(message,ctx) { await dispatch('message',message,ctx); }

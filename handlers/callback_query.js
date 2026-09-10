import { dispatch } from 'lib/runtime';
export default async function(callback,ctx) { await dispatch('callback_query',callback,ctx); }

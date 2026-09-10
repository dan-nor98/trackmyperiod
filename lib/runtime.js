import { api, db, InputFile } from 'sdk';
import { handleUpdate } from 'lib/app';
import { drain } from 'lib/delivery';

export async function dispatch(kind,payload,ctx) {
  if(!Number.isSafeInteger(ctx?.update?.update_id)) throw new Error('ctx.update.update_id is required');
  const update={update_id:ctx.update.update_id,[kind]:payload};
  const targets=await handleUpdate(update,{api,db});
  if(kind==='callback_query'&&payload.message?.chat?.type==='private'&&payload.message.chat.id===payload.from?.id) {
    try { await api.answerCallbackQuery({callback_query_id:payload.id}); }
    catch(error) { if(![400,403].includes(error.code)) console.warn('callback_ack_failed'); }
  }
  for(const id of targets) await drain(db,api,InputFile,id);
}

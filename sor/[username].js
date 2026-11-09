// /sor/kullanici: paylaşılan gizli soru linklerinin önizlemesi
import { htmlResponse, renderAsk, rpc } from '../_lib.js';

export async function onRequestGet(context) {
  const { request, params, env } = context;
  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(new URL('/', url));
  const template = await asset.text();
  const username = String(params.username || '').toLowerCase();
  if (!/^[a-z0-9_.]{3,20}$/.test(username)) return htmlResponse(template, 60);
  try {
    const t = await rpc(env, 'ask_target', { p_username: username });
    if (!t || !t.username) return htmlResponse(template, 60);
    return htmlResponse(renderAsk(template, t), 300);
  } catch (e) {
    return htmlResponse(template, 30);
  }
}

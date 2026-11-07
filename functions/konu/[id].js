// /konu/123-baslik adreslerinde: Google ve sosyal medya önizlemeleri için
// sayfanın başlığını, açıklamasını ve içeriğini sunucuda doldurur.
import { htmlResponse, postPath, renderPost, rpc } from '../_lib.js';

export async function onRequestGet(context) {
  const { request, params, env } = context;
  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(new URL('/', url));
  const template = await asset.text();
  const id = parseInt(String(params.id || ''), 10);
  if (!id) return htmlResponse(template, 60);
  try {
    const [post, comments] = await Promise.all([
      rpc(env, 'get_post', { p_id: id }),
      rpc(env, 'list_comments', { p_post: id }).catch(() => [])
    ]);
    if (!post || !post.id) return htmlResponse(template, 60);
    // Başlık değiştiyse eski adresi yenisine kalıcı yönlendir
    const want = postPath(post);
    if (decodeURIComponent(url.pathname) !== want) return Response.redirect(new URL(want + url.search, url).toString(), 301);
    return htmlResponse(renderPost(template, post, Array.isArray(comments) ? comments : []));
  } catch (e) {
    // Paylaşım yoksa, gizliyse ya da veritabanına ulaşılamazsa normal sayfa açılır
    return htmlResponse(template, 30);
  }
}

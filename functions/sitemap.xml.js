// /sitemap.xml: Google'a sitedeki sayfaları bildirir.
import { SITE, esc, postPath, rpc } from './_lib.js';

export async function onRequestGet({ env }) {
  const urls = [
    { loc: SITE + '/', changefreq: 'hourly', priority: '1.0' },
    { loc: SITE + '/itiraflar', changefreq: 'hourly', priority: '0.9' },
    { loc: SITE + '/kurallar', changefreq: 'monthly', priority: '0.3' }
  ];
  for (const kind of ['soru', 'itiraf']) {
    try {
      const posts = await rpc(env, 'list_posts', { p_kind: kind, p_category: null, p_topic: null, p_sort: 'new', p_unanswered: false });
      for (const p of posts || []) {
        urls.push({ loc: SITE + postPath(p), lastmod: String(p.created_at || '').slice(0, 10), changefreq: 'daily', priority: kind === 'soru' ? '0.8' : '0.6' });
      }
    } catch (e) { /* veritabanına ulaşılamazsa sabit sayfalarla devam */ }
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url><loc>' + esc(u.loc) + '</loc>' + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '') +
      '<changefreq>' + u.changefreq + '</changefreq><priority>' + u.priority + '</priority></url>').join('\n') +
    '\n</urlset>\n';
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=900' } });
}

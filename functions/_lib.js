// Cloudflare Pages Functions için ortak yardımcılar.
// Supabase'in herkese açık (publishable) anahtarı; site config.js ile aynı değerler.
// Cloudflare'de ortam değişkeni (SUPABASE_URL / SUPABASE_ANON_KEY) tanımlanırsa onlar kullanılır.
export const DEFAULTS = {
  SUPABASE_URL: 'https://gzqrqdddpuahtvnyhheq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_V6DzSfxYsCNxA4X7x4CNlw_09lw_ARK'
};
export const SITE = 'https://kimsebilmesin.com';
export const SITE_NAME = 'Kimse Bilmesin';

export function cfg(env) {
  return {
    url: (env && env.SUPABASE_URL) || DEFAULTS.SUPABASE_URL,
    key: (env && env.SUPABASE_ANON_KEY) || DEFAULTS.SUPABASE_ANON_KEY
  };
}

export async function rpc(env, name, args = {}) {
  const c = cfg(env);
  const res = await fetch(c.url + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: { apikey: c.key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(args)
  });
  if (!res.ok) throw new Error('rpc ' + name + ' ' + res.status);
  return res.json();
}

const TR = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c', â: 'a', î: 'i', û: 'u' };
export function slugify(text) {
  return String(text || '')
    .replace(/[ıİşŞğĞüÜöÖçÇâîû]/g, (c) => TR[c])
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '');
}
export function postPath(p) {
  const s = slugify(p.title || p.body || '');
  return '/konu/' + p.id + (s ? '-' + s : '');
}

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export function clip(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut) + '…';
}
function jsonLd(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
}

function setMeta(html, re, replacement) {
  return re.test(html) ? html.replace(re, replacement) : html;
}

// index.html şablonuna bir paylaşımın başlık, açıklama, önizleme ve içeriğini yerleştirir.
export function renderPost(template, post, comments = []) {
  const isConf = post.kind === 'itiraf';
  const url = SITE + postPath(post);
  const heading = isConf ? 'İtiraf #' + post.id : post.title;
  const title = clip(heading, 60) + ' | ' + SITE_NAME;
  const desc = clip(isConf ? post.body : (post.body || post.title), 155);
  const visible = comments.filter((c) => !c.hidden);

  let html = template;
  html = setMeta(html, /<title>[^<]*<\/title>/, '<title>' + esc(title) + '</title>');
  html = setMeta(html, /<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(desc) + '">');
  html = setMeta(html, /<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + esc(url) + '">');
  html = setMeta(html, /<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="article">');
  html = setMeta(html, /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(clip(heading, 90)) + '">');
  html = setMeta(html, /<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(desc) + '">');
  html = setMeta(html, /<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + esc(url) + '">');

  let ld = '';
  if (!isConf && visible.length > 0) {
    const ans = (c) => ({
      '@type': 'Answer',
      text: c.body,
      dateCreated: c.created_at,
      url: url + '#cevap-' + c.id,
      author: { '@type': 'Person', name: c.author ? '@' + c.author.username : 'Gizli üye' }
    });
    const best = visible.find((c) => c.is_best);
    const others = visible.filter((c) => !c.is_best).slice(0, 10);
    const q = {
      '@type': 'Question',
      name: post.title,
      text: post.body || post.title,
      answerCount: visible.length,
      dateCreated: post.created_at,
      author: { '@type': 'Person', name: post.author ? '@' + post.author.username : 'Gizli üye' }
    };
    if (best) q.acceptedAnswer = ans(best);
    if (others.length) q.suggestedAnswer = others.map(ans);
    ld = jsonLd({ '@context': 'https://schema.org', '@type': 'QAPage', mainEntity: q });
  }
  html = html.replace('<!--SEO-->', ld);

  // JavaScript çalışmadan da okunabilen içerik (uygulama açılınca bunun yerini alır)
  const answersHtml = visible.slice(0, 20).map((c) =>
    '<li id="cevap-' + esc(c.id) + '"><strong>' + esc(c.author ? '@' + c.author.username : 'Gizli üye') + '</strong>: ' + esc(c.body) + '</li>'
  ).join('');
  const body =
    '<main class="seo-static" style="max-width:720px;margin:0 auto;padding:24px 16px">' +
    '<h1>' + esc(heading) + '</h1>' +
    (isConf ? '' : '<p><em>' + esc(post.category || '') + (post.topic ? ' · #' + esc(post.topic) : '') + '</em></p>') +
    '<p>' + esc(post.body || '') + '</p>' +
    (answersHtml ? '<h2>' + (isConf ? 'Yorumlar' : 'Cevaplar') + '</h2><ul>' + answersHtml + '</ul>' : '') +
    '<p><a href="/">Kimse Bilmesin ana sayfası</a></p>' +
    '</main>';
  html = html.replace('<div id="root"></div>', '<div id="root">' + body + '</div>');
  return html;
}

export function htmlResponse(html, maxAge = 120) {
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=' + maxAge }
  });
}

// /sor/kullanici sayfası: WhatsApp, Telegram ve Instagram önizlemesinde davet başlığı görünsün; Google'da listelenmesin.
export function renderAsk(template, t) {
  const url = SITE + '/sor/' + t.username;
  const title = '@' + t.username + ' · Bana gizlice bir şey sor 🤫';
  const desc = 'Kim olduğun gösterilmez. Aklındakini isim vermeden sor. · Kimse Bilmesin';
  let html = template;
  html = setMeta(html, /<title>[^<]*<\/title>/, '<title>' + esc(title + ' | ' + SITE_NAME) + '</title>');
  html = setMeta(html, /<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(desc) + '">');
  html = setMeta(html, /<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + esc(url) + '">');
  html = setMeta(html, /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(title) + '">');
  html = setMeta(html, /<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(desc) + '">');
  html = setMeta(html, /<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + esc(url) + '">');
  html = html.replace('<!--SEO-->', '<meta name="robots" content="noindex, follow">');
  return html;
}

// Generates per-section static pages (/prices/, /works/, /calc/, /faq/), sitemap.xml and robots.txt from www/index.html.
// Usage: node tools/build_routes.mjs            (keeps the current domain)
//        SITE_URL=https://darkomgypsum.com node tools/build_routes.mjs   (switch domain everywhere)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const WWW = path.resolve(new URL('../www', import.meta.url).pathname);
let html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
const cur = html.match(/<link rel="canonical" href="(https?:\/\/[^\/"]+)\//)[1];
const SITE = (process.env.SITE_URL || cur).replace(/\/$/, '');
if (SITE !== cur) { html = html.split(cur).join(SITE); fs.writeFileSync(path.join(WWW, 'index.html'), html); }
const grab = (re) => { const m = html.match(re); if (!m) throw new Error('missing ' + re); return m[0]; };
const ctx = {};
vm.createContext(ctx);
vm.runInContext((grab(/const BUSINESS_PHONE = [^;]*;/) + grab(/const WARRANTY_YEARS = [^;]*;/) + grab(/const WARRANTY_LABEL = [^;]*;/) + grab(/const SERVICE_AREAS = \[[^\]]*\];/).replace(/const /g, 'var ')).replace(/const /g, "var "), ctx);
const meta = vm.runInNewContext('(' + html.match(/const SEO_META = (\{[\s\S]*?\n        \});/)[1] + ')');
const faqSrc = html.match(/faqList\(\) \{\s*return (\[[\s\S]*?\n                \]);/)[1];
const faqs = vm.runInNewContext('(' + faqSrc + ')', { WARRANTY_LABEL: ctx.WARRANTY_LABEL, SERVICE_AREAS: ctx.SERVICE_AREAS, BUSINESS_PHONE: ctx.BUSINESS_PHONE });
const works = [...html.matchAll(/\{ img: '(portfolio\/[^']+)', title: '([^']+)'/g)].map(m => ({ img: m[1], title: m[2] }));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const phone = ctx.BUSINESS_PHONE;
const cta = `<p class="text-sm font-bold text-primaryDark">للمعاينة وعرض السعر: <a href="tel:+2${phone}">${phone}</a> أو واتساب <a href="https://wa.me/2${phone}">wa.me/2${phone}</a></p>`;
const P = 'text-sm text-gray-700 leading-relaxed mb-3', H1 = 'text-2xl font-black text-primaryDark mb-2', H2 = 'text-lg font-black text-primaryDark mb-1';
const content = {
  prices: `<h1 class="${H1}">أسعار الحوائط والتجاليد والسيمنت بورد</h1><p class="${P}">أسعار بالمتر، توريد وتركيب، لحوائط الجبس بورد والتجاليد والسيمنت بورد وبلاطات 60×60 في ${ctx.SERVICE_AREAS.slice(0,3).join('، ')} وباقي مناطق الجيزة والقاهرة الكبرى.</p><p class="${P}">الأسعار شاملة التوريد والتركيب والمصنعية وغير شاملة الدهانات النهائية. المعاينة والمقايسة مجانية داخل مناطق الخدمة.</p>${cta}`,
  portfolio: `<h1 class="${H1}">أعمالنا وخدماتنا في الجبس بورد</h1><p class="${P}">صور حقيقية من أعمال داركم: أسقف معلقة بإضاءة مخفية وشادو جاب، بيت نور، وتجاليد حوائط. ضمان تنفيذ ${ctx.WARRANTY_LABEL}.</p><div class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">${works.map(w => `<img src="${w.img}" alt="${esc(w.title)}" loading="lazy" width="400" height="300" class="w-full rounded-xl">`).join('')}</div>${cta}`,
  calc: `<h1 class="${H1}">احسب سعر سقف الجبس بورد لشقتك</h1><p class="${P}">اكتب المساحة واختار المستوى (اقتصادي، أساسي، قياسي، مميز، ملكي) ولون الألواح وشوف التكلفة التقريبية بالمتر المربع والمتر الطولي، مع الإضافات مثل الشادو والتيش.</p>${cta}`,
  faq: `<h1 class="${H1}">أسئلة شائعة عن الجبس بورد والضمان والتركيب</h1>${faqs.map(([q, a]) => `<h2 class="${H2}">${esc(q)}</h2><p class="${P}">${esc(a)}</p>`).join('')}${cta}`
};
const dirs = { prices: 'prices', portfolio: 'works', calc: 'calc', faq: 'faq' };
const reMain = /(<main id="main-content"[^>]*>)[\s\S]*?(<\/main>)/;
for (const [view, dir] of Object.entries(dirs)) {
  const [title, desc] = meta[view]; const url = `${SITE}/${dir}/`;
  let h = html;
  h = h.replace('<head>', '<head>\n    <base href="/">');
  h = h.replace(/\s*<script type="application\/ld\+json">\s*\{"@context":"https:\/\/schema.org","@type":"HomeAndConstructionBusiness"[\s\S]*?<\/script>/, '');
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  h = h.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  h = h.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  h = h.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`);
  h = h.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
  if (view === 'faq') h = h.replace('</head>', `    <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })}</script>\n</head>`);
  h = h.replace(reMain, `$1\n        <section>${content[view]}</section>\n    $2`);
  fs.mkdirSync(path.join(WWW, dir), { recursive: true });
  fs.writeFileSync(path.join(WWW, dir, 'index.html'), h);
}
const urls = ['/', ...Object.values(dirs).map(d => `/${d}/`)];
fs.writeFileSync(path.join(WWW, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE}${u}</loc><changefreq>weekly</changefreq><priority>${u === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(WWW, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log('ok', SITE, urls.join(' '), 'faqs', faqs.length, 'works', works.length);

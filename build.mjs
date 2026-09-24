// Builds the Arnaki marketing + legal site into ./dist (plain static files).
// Usage: node build.mjs        (no dependencies; Node 18+)
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const cfg = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const DOMAIN = String(cfg.domain || '').replace(/\/+$/, '');
const year = new Date().getFullYear();

// ---- pages -----------------------------------------------------------------
const PAGES = [
  { file: 'index', slug: '', nav: 'home',
    he: { title: 'Arnaki · ארנקי — הארנק החכם לכרטיסי מתנה', desc: 'כל תווי השי וכרטיסי המתנה במקום אחד, המלצה איך לשלם הכי משתלם, ושוק להחלפת כרטיסים. בקרוב ב-App Store.' },
    en: { title: 'Arnaki — the smart wallet for gift cards', desc: 'All your gift cards in one place, a recommendation for the best way to pay, and a community marketplace to swap cards. Coming soon to the App Store.' } },
  { file: 'privacy', slug: 'privacy', legal: true,
    he: { title: 'מדיניות פרטיות · Arnaki', desc: 'איזה מידע Arnaki אוספת, למה, עם מי הוא משותף ואילו זכויות יש לכם.' },
    en: { title: 'Privacy Policy · Arnaki', desc: 'What information Arnaki collects, why, who it is shared with, and your rights.' } },
  { file: 'terms', slug: 'terms', legal: true,
    he: { title: 'תנאי שימוש · Arnaki', desc: 'תנאי השימוש באפליקציה ובשוק ההחלפות של Arnaki, כולל תנאים למוכרים.' },
    en: { title: 'Terms of Use · Arnaki', desc: 'The terms for using the Arnaki app and its swap marketplace, including seller terms.' } },
  { file: 'support', slug: 'support', nav: 'support',
    he: { title: 'תמיכה · Arnaki', desc: 'צריכים עזרה עם Arnaki? שאלות נפוצות, דיווח על בעיה ויצירת קשר.' },
    en: { title: 'Support · Arnaki', desc: 'Need help with Arnaki? FAQs, reporting a problem, and how to contact us.' } },
  { file: 'delete-account', slug: 'delete-account',
    he: { title: 'מחיקת חשבון · Arnaki', desc: 'איך מוחקים את חשבון Arnaki ומה קורה למידע שלכם.' },
    en: { title: 'Delete your account · Arnaki', desc: 'How to delete your Arnaki account and what happens to your data.' } },
  { file: 'accessibility', slug: 'accessibility',
    he: { title: 'הצהרת נגישות · Arnaki', desc: 'הצהרת הנגישות של אתר Arnaki ופרטי רכז הנגישות.' },
    en: { title: 'Accessibility Statement · Arnaki', desc: 'The accessibility statement for the Arnaki website and how to reach our accessibility coordinator.' } },
];

// ---- tokens ----------------------------------------------------------------
const LABELS = {
  companyNumber: ['מספר חברה (ח.פ.)', 'company number'],
  addressHe: ['כתובת רשומה', 'registered address (Hebrew)'],
  addressEn: ['כתובת רשומה (אנגלית)', 'registered address'],
  a11yCoordinatorHe: ['שם רכז/ת הנגישות', 'accessibility coordinator (Hebrew)'],
  a11yCoordinatorEn: ['שם רכז/ת הנגישות (אנגלית)', 'accessibility coordinator'],
  a11yPhone: ['טלפון רכז/ת הנגישות', 'accessibility coordinator phone'],
};
const warnings = new Set();

function tokens(lang) {
  const he = lang === 'he';
  const storeCta = cfg.appStoreUrl
    ? `<a class="btn btn-primary" href="${cfg.appStoreUrl}">${he ? 'להורדה ב-App Store' : 'Download on the App Store'}</a>`
    : `<span class="btn btn-soon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9s-2-.9-3.3-.9c-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.2zM14 5.4c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.5-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.4z"/></svg>${he ? `בקרוב ב-App Store · ${cfg.launchDateHe}` : `Coming to the App Store · ${cfg.launchDateEn}`}</span>`;
  return { ...cfg, year, storeCta, lang };
}

function fill(html, lang) {
  const t = tokens(lang);
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = t[key];
    if (v === undefined || v === null || v === '') {
      const label = (LABELS[key] || [key, key])[lang === 'he' ? 0 : 1];
      warnings.add(key);
      return `<mark class="todo">${lang === 'he' ? 'להשלמה' : 'to complete'}: ${label}</mark>`;
    }
    return String(v);
  });
}

// ---- layout ----------------------------------------------------------------
const pathFor = (lang, slug) => (lang === 'en' ? '/en/' : '/') + (slug ? slug + '/' : '');

// Content Security Policy. GitHub Pages cannot send response headers, so the policy
// goes in a <meta> tag on every page (frame-ancestors is header-only and is left out
// there); the same policy is also written to _headers for hosts that read it.
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; font-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'";
const CSP_META = CSP;
const CSP_HEADER = CSP + "; frame-ancestors 'none'";

function layout(lang, page, body) {
  const he = lang === 'he';
  const m = page[lang];
  const other = he ? 'en' : 'he';
  const here = pathFor(lang, page.slug);
  const t = (a, b) => (he ? a : b);
  const L = (slug) => pathFor(lang, slug);
  const cur = (key) => (page.nav === key ? ' aria-current="page"' : '');
  const draft = page.legal && !cfg.legalApproved
    ? `<div class="draft" role="note">${t('טיוטה לבדיקה משפטית — הנוסח עשוי להשתנות לפני הפרסום הסופי.', 'Draft pending legal review — wording may change before final publication.')}</div>`
    : '';
  const jsonLd = page.file === 'index' ? `
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: cfg.companyEn, url: DOMAIN, email: cfg.supportEmail, brand: { '@type': 'Brand', name: 'Arnaki' } },
      { '@type': 'MobileApplication', name: 'Arnaki', alternateName: 'ארנקי', operatingSystem: 'iOS', applicationCategory: 'ShoppingApplication',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' }, publisher: { '@type': 'Organization', name: cfg.companyEn } },
    ],
  })}</script>` : '';

  return `<!doctype html>
<html lang="${he ? 'he' : 'en'}" dir="${he ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${CSP_META}">
  <title>${m.title}</title>
  <meta name="description" content="${m.desc}">
  <meta name="theme-color" content="#1D4ED8">
  <meta name="color-scheme" content="light">
  <link rel="canonical" href="${DOMAIN}${here}">
  <link rel="alternate" hreflang="he" href="${DOMAIN}${pathFor('he', page.slug)}">
  <link rel="alternate" hreflang="en" href="${DOMAIN}${pathFor('en', page.slug)}">
  <link rel="alternate" hreflang="x-default" href="${DOMAIN}${pathFor('he', page.slug)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Arnaki">
  <meta property="og:title" content="${m.title}">
  <meta property="og:description" content="${m.desc}">
  <meta property="og:url" content="${DOMAIN}${here}">
  <meta property="og:locale" content="${he ? 'he_IL' : 'en_US'}">
  <link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/heebo-${he ? 'hebrew' : 'latin'}.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/styles.css">
  <script src="/assets/a11y.js" defer></script>${jsonLd}
</head>
<body class="${page.legal || page.file !== 'index' ? 'doc' : 'home'}">
  <a class="skip" href="#main">${t('דלג לתוכן הראשי', 'Skip to main content')}</a>
  <header class="site-header">
    <div class="wrap bar">
      <a class="brand" href="${L('')}" aria-label="${t('Arnaki, לעמוד הבית', 'Arnaki home')}">
        <img src="/assets/icon.svg" alt="" width="34" height="34">
        <span class="brand-name">Arnaki</span><span class="brand-he" lang="he">ארנקי</span>
      </a>
      <nav aria-label="${t('ניווט ראשי', 'Main')}">
        <ul class="nav">
          <li class="nav-hide"><a href="${L('')}#features">${t('מה זה עושה', 'Features')}</a></li>
          <li class="nav-hide"><a href="${L('')}#how">${t('איך זה עובד', 'How it works')}</a></li>
          <li class="nav-hide"><a href="${L('')}#faq">${t('שאלות', 'FAQ')}</a></li>
          <li><a href="${L('support')}"${cur('support')}>${t('תמיכה', 'Support')}</a></li>
          <li><a class="lang" href="${pathFor(other, page.slug)}" hreflang="${other}" lang="${other}">${he ? 'English' : 'עברית'}</a></li>
        </ul>
      </nav>
    </div>
  </header>
  <main id="main">
${draft}${body}
  </main>
  <footer class="site-footer">
    <div class="wrap foot">
      <div class="foot-brand">
        <a class="brand" href="${L('')}"><img src="/assets/icon.svg" alt="" width="30" height="30"><span class="brand-name">Arnaki</span><span class="brand-he" lang="he">ארנקי</span></a>
        <p>${t('Arnaki היא מוצר של {{companyHe}}, ח.פ. {{companyNumber}}, {{addressHe}}.', 'Arnaki is a product of {{companyEn}}, company no. {{companyNumber}}, {{addressEn}}.')}</p>
        <p><a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
      </div>
      <nav aria-label="${t('קישורים משפטיים ותמיכה', 'Legal and support')}">
        <ul class="foot-links">
          <li><a href="${L('support')}">${t('תמיכה', 'Support')}</a></li>
          <li><a href="${L('privacy')}">${t('מדיניות פרטיות', 'Privacy Policy')}</a></li>
          <li><a href="${L('terms')}">${t('תנאי שימוש', 'Terms of Use')}</a></li>
          <li><a href="${L('delete-account')}">${t('מחיקת חשבון', 'Delete your account')}</a></li>
          <li><a href="${L('accessibility')}">${t('הצהרת נגישות', 'Accessibility')}</a></li>
        </ul>
      </nav>
    </div>
    <div class="wrap fine">
      <p>© {{year}} {{${he ? 'companyHe' : 'companyEn'}}}. ${t('Apple, App Store ו-iPhone הם סימנים מסחריים של Apple Inc. שמות וסימנים של מותגים שייכים לבעליהם, ו-Arnaki אינה קשורה אליהם.', 'Apple, App Store and iPhone are trademarks of Apple Inc. Brand names and marks belong to their owners; Arnaki is not affiliated with them.')}</p>
    </div>
  </footer>
</body>
</html>
`;
}

// ---- build -----------------------------------------------------------------
if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });

const urls = [];
for (const lang of ['he', 'en']) {
  for (const page of PAGES) {
    const body = readFileSync(join(SRC, 'pages', lang, page.file + '.html'), 'utf8');
    const html = fill(layout(lang, page, body), lang);
    const out = join(DIST, pathFor(lang, page.slug), 'index.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    urls.push(DOMAIN + pathFor(lang, page.slug));
  }
}

// 404 (bilingual, no layout tokens needed beyond the basics)
const notFound = fill(layout('he', { file: '404', slug: '', he: { title: 'העמוד לא נמצא · Arnaki', desc: '' }, en: { title: 'Page not found · Arnaki', desc: '' } },
  `<section class="wrap narrow notfound"><h1>העמוד לא נמצא</h1><p>ייתכן שהקישור שגוי או שהעמוד הועבר.</p><p><a class="btn btn-primary" href="/">לעמוד הבית</a> <a class="btn btn-ghost" href="/en/" lang="en" dir="ltr">English home</a></p></section>`), 'he');
writeFileSync(join(DIST, '404.html'), notFound);

writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
writeFileSync(join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);

// CNAME records the custom domain for hosts that publish from a branch (GitHub Pages
// in branch mode, others); with the GitHub Actions deploy the domain is set once in
// Settings → Pages and this file is simply ignored. .nojekyll skips Jekyll processing.
writeFileSync(join(DIST, 'CNAME'), new URL(DOMAIN).hostname + '\n');
writeFileSync(join(DIST, '.nojekyll'), '');

// Security headers — read by Cloudflare Pages and Netlify (GitHub Pages ignores this file
// and relies on the CSP meta tag above plus its own HTTPS enforcement).
writeFileSync(join(DIST, '_headers'), `/*
  Content-Security-Policy: ${CSP_HEADER}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);

console.log(`Built ${urls.length} pages + 404 into ${DIST}`);
if (!cfg.legalApproved) console.log('• Legal pages show a DRAFT banner (legalApproved=false).');
if (warnings.size) console.log('• Still to complete in site.config.json: ' + [...warnings].join(', '));

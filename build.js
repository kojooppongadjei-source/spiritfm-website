const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ROOT = __dirname;
const NEWS_DIR = path.join(ROOT, 'content', 'news');
const NAV = (active) => `
<nav class="site-nav">
  <div class="wrap">
    <a href="/" class="brand" style="display:flex;align-items:center;gap:12px;"><img src="/assets/images/spirit-fm-logo-pink.png" alt="Spirit FM — Music 4 Life" style="height:44px;width:auto;display:block;"><span style="font-size:11px;font-weight:700;letter-spacing:.06em;color:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.22);padding:3px 9px;border-radius:100px;">KAMPALA, UG</span></a>
    <div class="nav-links">
      <a href="/"${active === 'home' ? ' class="active"' : ''}>Home</a>
      <a href="/shows.html"${active === 'shows' ? ' class="active"' : ''}>Shows</a>
      <a href="/about.html"${active === 'about' ? ' class="active"' : ''}>About</a>
      <a href="/news.html"${active === 'news' ? ' class="active"' : ''}>News</a>
      <a href="/contact.html"${active === 'contact' ? ' class="active"' : ''}>Contact</a>
    </div>
    <a href="/#listen" class="nav-cta">▶ Listen Live</a>
    <button class="menu-toggle" aria-label="Menu">☰</button>
  </div>
</nav>`;

const FOOTER = `
<footer>
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">Spirit FM 96.6</div>
        <p>An inspirational radio station broadcasting Your Music For Life to 13 districts of central Uganda.</p>
      </div>
      <div>
        <h4>Explore</h4>
        <a href="/shows.html">Shows</a>
        <a href="/about.html">About</a>
        <a href="/news.html">News</a>
        <a href="/contact.html">Contact</a>
      </div>
      <div>
        <h4>Studio</h4>
        <p>Kamwokya Media Plaza<br>Kampala, Uganda</p>
      </div>
      <div>
        <h4>Reach Us</h4>
        <a href="tel:+256772488381">+256 772 488 381</a>
        <a href="tel:+256785991712">+256 785 991 712</a>
        <a href="mailto:info@spiritfm966.com">info@spiritfm966.com</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2026 Spirit FM 96.6. All Rights Reserved.</span>
      <span>Part of the Spirit Media family — with Spirit TV.</span>
    </div>
  </div>
</footer>`;

function loadPosts() {
  if (!fs.existsSync(NEWS_DIR)) return [];
  const files = fs.readdirSync(NEWS_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(f => {
    const raw = fs.readFileSync(path.join(NEWS_DIR, f), 'utf8');
    const { data, content } = matter(raw);
    const slug = f.replace(/\.md$/, '');
    return {
      slug,
      title: data.title || 'Untitled',
      date: data.date ? new Date(data.date) : new Date(0),
      image: data.image || '',
      summary: data.summary || '',
      body: content.trim(),
    };
  });
  posts.sort((a, b) => b.date - a.date);
  return posts;
}

function formatDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildNewsListing(posts) {
  const cardsHtml = posts.map(p => `
      <article class="card">
        ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}">` : ''}
        <div class="card-body">
          <span class="tag">${formatDate(p.date)}</span>
          <h3><a href="/news/${p.slug}/" style="color:inherit;">${escapeHtml(p.title)}</a></h3>
          <p>${escapeHtml(p.summary)}</p>
        </div>
      </article>`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>News — Spirit FM 96.6</title>
<meta name="description" content="News and updates from Spirit FM 96.6.">
<link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
${NAV('news')}
<header class="page-header">
  <div class="wrap">
    <div class="eyebrow">News</div>
    <h1>Updates from Spirit FM</h1>
    <p>What's happening on and around the station.</p>
  </div>
</header>
<section>
  <div class="wrap">
    <div class="grid-2" style="align-items:start;gap:32px;grid-template-columns:1fr 1fr;">
${cardsHtml}
    </div>
  </div>
</section>
${FOOTER}
<script src="/assets/js/nav.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, 'news.html'), html);
}

function buildNewsPost(p) {
  const outDir = path.join(ROOT, 'news', p.slug);
  fs.mkdirSync(outDir, { recursive: true });
  const bodyHtml = p.body.split(/\n\n+/).map(para => `<p>${escapeHtml(para)}</p>`).join('\n      ');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(p.title)} — Spirit FM 96.6</title>
<meta name="description" content="${escapeHtml(p.summary)}">
<link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
${NAV('news')}
<header class="page-header">
  <div class="wrap">
    <div class="eyebrow">${formatDate(p.date)}</div>
    <h1>${escapeHtml(p.title)}</h1>
  </div>
</header>
<section>
  <div class="wrap" style="max-width:760px;">
    ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" style="border-radius:16px;margin-bottom:32px;width:100%;">` : ''}
    <div style="font-size:16.5px;color:#333;line-height:1.7;">
      ${bodyHtml}
    </div>
    <p style="margin-top:40px;"><a href="/news.html" class="btn btn-outline" style="border-color:rgba(11,11,12,.2);color:var(--ink);">← Back to News</a></p>
  </div>
</section>
${FOOTER}
<script src="/assets/js/nav.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

const posts = loadPosts();
buildNewsListing(posts);
posts.forEach(buildNewsPost);
console.log(`Built news.html + ${posts.length} news post page(s).`);

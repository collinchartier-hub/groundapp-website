import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');
const origin = 'https://groundapp.live';
const routes = [
  ['site/index.html', '/'], ['site/blog/index.html', '/blog/'],
  ...['why-i-built-groundapp', 'nervous-system-regulation-explained', 'science-of-breathwork', 'future-of-breathwork-tech', 'breathing-techniques-for-anxiety'].map(slug => [`site/blog/${slug}/index.html`, `/blog/${slug}/`]),
  ...['coherence', 'three-part-breath', 'alternate-nostril'].map(slug => [`site/atlas/${slug}/index.html`, `/atlas/${slug}/`]),
  ...['play', 'support', 'privacy', 'terms', 'accessibility', 'legal-notice', 'delete-account'].map(slug => [`site/${slug}.html`, `/${slug}`]),
];
const tag = (html, key) => html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]+)"`))?.[1];

// Build generated blog and game pages before this test; only their source templates are edited.
test('public pages have unique descriptive metadata and a consistent canonical social URL', () => {
  const titles = new Set();
  for (const [file, route] of routes) {
    const html = read(file);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const desc = tag(html, 'description');
    assert.ok(title && title.length >= 35 && title.length <= 75, `${file}: title`);
    assert.ok(desc && desc.length >= 120 && desc.length <= 210, `${file}: description`);
    assert.ok(!titles.has(title), `${file}: duplicated title`);
    titles.add(title);
    assert.match(html, /<html lang="en">/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: one h1`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${origin}${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.equal(tag(html, 'og:url'), origin + route, `${file}: social URL`);
    assert.ok(tag(html, 'og:image')?.startsWith(origin + '/'), `${file}: existing image`);
    assert.equal(tag(html, 'twitter:card'), 'summary_large_image', `${file}: Twitter card`);
    assert.ok(!/name="robots" content="[^"]*noindex/.test(html), `${file}: indexable`);
  }
});

test('home graph connects app, founder, organization and visible FAQ without invented ratings', () => {
  const html = read('site/index.html');
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1])['@graph'];
  const byId = Object.fromEntries(graph.map(node => [node['@id'], node]));
  const app = byId[origin + '/#app'];
  assert.equal(byId['https://collinchartier.com/#person'].url, 'https://collinchartier.com/');
  assert.equal(app.author['@id'], 'https://collinchartier.com/#person');
  assert.equal(byId[origin + '/#organization'].founder['@id'], 'https://collinchartier.com/#person');
  assert.deepEqual(app.offers.map(o => [o.price, o.priceCurrency, o.priceSpecification?.billingDuration]), [
    ['0', 'USD', undefined], ['39.99', 'USD', 'P1Y'], ['6.99', 'USD', 'P1M'],
  ]);
  assert.ok(!('aggregateRating' in app));
  for (const question of byId[origin + '/#faq'].mainEntity) {
    assert.ok(html.includes(`<summary>${question.name}</summary>`));
    assert.ok(html.includes(question.acceptedAnswer.text) || question.name === 'Where can I learn about breathwork?' || question.name === 'Where is my data, and can I delete it?' || question.name === "Is Bodie's Breath Run free?");
  }
});

test('articles connect to the same founder and publisher with real front-matter dates', () => {
  for (const [file, route] of routes.filter(([file]) => file.startsWith('site/blog/') && file !== 'site/blog/index.html')) {
    const html = read(file);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1])['@graph'];
    const article = graph.find(node => node['@type'] === 'BlogPosting');
    assert.equal(article['@id'], origin + route + '#article');
    assert.equal(article.author['@id'], 'https://collinchartier.com/#person');
    assert.equal(article.publisher['@id'], origin + '/#organization');
    const source = ['01-why-i-built-groundapp.md', '02-nervous-system-regulation-explained.md',
      '03-science-of-breathwork.md', '04-future-of-breathwork-tech.md',
      '05-breathing-techniques-for-anxiety.md'].map(name => read(`content/posts/${name}`))
      .find(post => post.includes(`slug: ${route.split('/')[2]}\n`));
    assert.ok(source, `${file}: front matter`);
    assert.equal(html.match(/<title>([^<]+)<\/title>/)[1], source.match(/^seo_title: (.+)$/m)[1]);
    assert.equal(article.description, source.match(/^seo_description: (.+)$/m)[1]);
    assert.equal(article.datePublished, source.match(/^date: (\d{4}-\d\d-\d\d)$/m)[1]);
    assert.equal(article.dateModified, source.match(/^updated: (\d{4}-\d\d-\d\d)$/m)[1]);
    assert.equal(article.mainEntityOfPage['@id'], origin + route);
  }
});

test('sitemap includes public pages only, and waiting room stays noindex', () => {
  const sitemap = read('site/sitemap.xml');
  for (const [, route] of routes) assert.ok(sitemap.includes(`<loc>${origin}${route}</loc>`), `missing ${route}`);
  assert.ok(!sitemap.includes('masterclass-waiting-room'));
  assert.match(read('site/masterclass-waiting-room/index.html'), /name="robots" content="noindex/);
  for (const partner of ['aion', 'arsenal', 'traverse', 'recon']) {
    assert.match(read(`site/${partner}/index.html`), /name="robots" content="noindex"/);
    assert.ok(!sitemap.includes(`<loc>${origin}/${partner}/</loc>`));
  }
  assert.match(read('site/robots.txt'), /Sitemap: https:\/\/groundapp.live\/sitemap.xml/);
});

test('game metadata does not advertise removed breath-hold challenges', () => {
  const source = read('game/build.py');
  assert.ok(!source.includes('push your longest breath hold'));
  assert.ok(source.includes('https://groundapp.live/#organization'));
});

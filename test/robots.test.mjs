import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Exercise crawl decisions with a real robots consumer, not directive spelling.
// Python is already required by the site's blog/game publishing tools.
test('search crawlers can read public pages and all crawlers respect private boundaries', () => {
  const policy = fileURLToPath(new URL('../site/robots.txt', import.meta.url));
  const decisions = JSON.parse(execFileSync('python3', ['-c', `
import json, sys
from urllib.robotparser import RobotFileParser
r = RobotFileParser()
with open(sys.argv[1]) as source:
    r.parse(source.read().splitlines())
agents = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'Claude-SearchBot',
          'PerplexityBot', 'GPTBot', 'ClaudeBot', 'unknown-crawler']
paths = ['/', '/blog/science-of-breathwork/', '/assets/css/home-v8.css',
         '/robots.txt', '/sitemap.xml', '/llms.txt', '/admin',
         '/admin/', '/admin/index.html', '/api/subscribe', '/api/partner/claim']
print(json.dumps([{ 'agent': a, 'path': p,
                   'allowed': r.can_fetch(a, 'https://groundapp.live' + p) }
                  for a in agents for p in paths]))
`, policy], { encoding: 'utf8' }));
  for (const { agent, path, allowed } of decisions) {
    const publicPath = !path.startsWith('/admin') && !path.startsWith('/api/');
    // Source-policy regression only. Cloudflare adds the live training rules;
    // this test must also permit a future explicit training opt-out here.
    if (publicPath && ['GPTBot', 'ClaudeBot'].includes(agent)) continue;
    assert.equal(allowed, publicPath, `${agent} crawl permission for ${path}`);
  }
});

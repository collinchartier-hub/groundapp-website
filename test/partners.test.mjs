// Partner-facing metadata is explicit and cannot be inherited from the prototype chain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTNERS, partnerConfig } from '../lib/partners.js';

test('Arsenal and AION keep separate copy, assets and identity', () => {
  assert.equal(partnerConfig('arsenal'), PARTNERS.arsenal);
  assert.equal(partnerConfig('aion'), PARTNERS.aion);
  assert.equal(PARTNERS.arsenal.emailLine.includes('cold plunge and the sauna'), true);
  assert.equal(PARTNERS.aion.emailLine.includes('AION builds your strength and your engine'), true);
  assert.equal(PARTNERS.aion.css, '/assets/css/aion-v1.css');
});

test('Traverse keeps its own code email, stylesheet and member identity', () => {
  const traverse = partnerConfig('traverse');
  assert.equal(traverse, PARTNERS.traverse);
  assert.equal(traverse.name, 'Traverse Fitness');
  assert.equal(traverse.short, 'Traverse');
  assert.equal(traverse.lockup, 'TRAVERSE');
  assert.equal(traverse.css, '/assets/css/traverse-v1.css');
  assert.ok(traverse.emailLine.includes('Traverse already puts breathwork into the sauna and the cold plunge.'));
});

test('RECON Wellness has its own community identity, stylesheet and code-email introduction', () => {
  const recon = partnerConfig('recon');
  assert.equal(recon, PARTNERS.recon);
  assert.equal(recon.slug, 'recon');
  assert.equal(recon.name, 'RECON Wellness');
  assert.equal(recon.short, 'RECON');
  assert.equal(recon.lockup, 'RECON WELLNESS');
  assert.equal(recon.css, '/assets/css/recon-v1.css');
  assert.equal(recon.emailLine, 'RECON helps you build recovery into your training week. GroundApp gives you guided breathwork to practise alongside that routine, wherever you are. Your first year of GroundApp Premium is on me.');
});

test('unknown slugs have no partner configuration', () => {
  assert.equal(partnerConfig('missing'), null);
  assert.equal(partnerConfig('__proto__'), null);
});

test('all partner forms load the new claim asset rather than the cached old version', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const slug of ['arsenal', 'aion', 'traverse', 'recon']) {
    const markup = await readFile(new URL(`../site/${slug}/index.html`, import.meta.url), 'utf8');
    assert.ok(markup.includes('/assets/js/partner-claim-v2.js'));
    assert.ok(!markup.includes('/assets/js/partner-claim-v1.js'));
  }
  const script = await readFile(new URL('../site/assets/js/partner-claim-v2.js', import.meta.url), 'utf8');
  assert.ok(script.includes('Your link is on the way to {email}'));
});

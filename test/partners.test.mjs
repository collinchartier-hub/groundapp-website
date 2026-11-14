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

test('unknown slugs have no partner configuration', () => {
  assert.equal(partnerConfig('missing'), null);
  assert.equal(partnerConfig('__proto__'), null);
});

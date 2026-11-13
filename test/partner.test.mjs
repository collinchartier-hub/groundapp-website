// test/partner.test.mjs: input rules for partner code claims.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPersonName, emailKey, validateClaim, newToken, isToken, isIosUA, redeemLink } from '../lib/partner.js';

const good = { partner: 'arsenal', first_name: ' Sam ', last_name: 'Lee', email: 'Sam.Lee+gym@Gmail.com', device: 'iphone', location: 'Arvada', member: true, newsletter: true, src: 'ig' };

test('cleanPersonName trims, collapses spaces and strips markup characters', () => {
  assert.equal(cleanPersonName('  Mary   Ann '), 'Mary Ann');
  assert.equal(cleanPersonName('<b>Sam</b>'), 'bSam/b');
  assert.equal(cleanPersonName(''), null);
  assert.equal(cleanPersonName('x'.repeat(61)), null);
  assert.equal(cleanPersonName('sam@example.com'), null);
  assert.equal(cleanPersonName('https://spam.example'), null);
});

test('emailKey treats gmail dots, plus tags and googlemail as one address', () => {
  assert.equal(emailKey('Sam.Lee+gym@Gmail.com'), 'samlee@gmail.com');
  assert.equal(emailKey('samlee@googlemail.com'), 'samlee@gmail.com');
  assert.equal(emailKey('sam.lee+x@arsenalhealth.com'), 'sam.lee@arsenalhealth.com');
});

test('validateClaim returns a clean value for good input', () => {
  assert.deepEqual(validateClaim(good), {
    value: { partner: 'arsenal', firstName: 'Sam', lastName: 'Lee', email: 'sam.lee+gym@gmail.com', emailKey: 'samlee@gmail.com',
      device: 'iphone', location: 'Arvada', newsletter: true, src: 'ig' },
  });
});

test('validateClaim names the first bad field', () => {
  assert.deepEqual(validateClaim({ ...good, first_name: '' }), { error: 'first_name' });
  assert.deepEqual(validateClaim({ ...good, last_name: '@' }), { error: 'last_name' });
  assert.deepEqual(validateClaim({ ...good, email: 'nope' }), { error: 'email' });
  assert.deepEqual(validateClaim({ ...good, device: 'windows' }), { error: 'device' });
  assert.deepEqual(validateClaim({ ...good, location: '' }), { error: 'location' });
  assert.deepEqual(validateClaim({ ...good, member: 'yes' }), { error: 'member' });
  assert.deepEqual(validateClaim({ ...good, partner: '../x' }), { error: 'partner' });
  assert.deepEqual(validateClaim(null), { error: 'partner' });
});

test('validateClaim drops an unsafe src and defaults newsletter to false', () => {
  const v = validateClaim({ ...good, src: '<script>', newsletter: 'true' }).value;
  assert.equal(v.src, null);
  assert.equal(v.newsletter, false);
});

test('tokens are 22 url-safe characters and unique', () => {
  const a = newToken();
  assert.ok(isToken(a));
  assert.notEqual(a, newToken());
  assert.equal(isToken('short'), false);
  assert.equal(isToken('a'.repeat(21) + '/'), false);
});

test('isIosUA is true for iPhone and iPad only', () => {
  assert.equal(isIosUA('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15'), true);
  assert.equal(isIosUA('Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X)'), true);
  assert.equal(isIosUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), false);
  assert.equal(isIosUA('Mozilla/5.0 (Linux; Android 15; Pixel 9)'), false);
  assert.equal(isIosUA(null), false);
});

test('redeemLink builds the member link', () => {
  assert.equal(redeemLink('arsenal', 'abc'), 'https://groundapp.live/arsenal/r/abc');
});

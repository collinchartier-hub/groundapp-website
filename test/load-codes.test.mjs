// test/load-codes.test.mjs: reading Apple's one-time code sheet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCodesCsv } from '../scripts/load-partner-codes.mjs';

const head = '#,Code,Redeem link,Given to,Date given,Notes';
const url = (c) => `https://apps.apple.com/redeem?ctx=offercodes&id=6760352779&code=${c}`;

test('reads number, code and link from each row', () => {
  const rows = parseCodesCsv(`${head}\n51,AAAABBBBCCCCDDDD11,${url('AAAABBBBCCCCDDDD11')},,,\r\n52,AAAABBBBCCCCDDDD22,${url('AAAABBBBCCCCDDDD22')},,,\n`);
  assert.deepEqual(rows, [
    { seq: 51, code: 'AAAABBBBCCCCDDDD11', redeem_url: url('AAAABBBBCCCCDDDD11') },
    { seq: 52, code: 'AAAABBBBCCCCDDDD22', redeem_url: url('AAAABBBBCCCCDDDD22') },
  ]);
});

test('refuses a row whose link does not carry its code', () => {
  assert.throws(() => parseCodesCsv(`${head}\n51,AAAABBBBCCCCDDDD11,${url('SOMETHINGELSE00000')},,,\n`), /row 2/);
});

test('refuses a duplicate code', () => {
  const row = `51,AAAABBBBCCCCDDDD11,${url('AAAABBBBCCCCDDDD11')},,,`;
  assert.throws(() => parseCodesCsv(`${head}\n${row}\n${row}\n`), /duplicate/);
});

test('refuses a sheet with the wrong header', () => {
  assert.throws(() => parseCodesCsv('code\nAAAA\n'), /header/);
});

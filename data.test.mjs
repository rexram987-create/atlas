import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCountryDetail } from './details.mjs';

const countries = JSON.parse(readFileSync(new URL('./countries.json', import.meta.url), 'utf8'));
const details = JSON.parse(readFileSync(new URL('./country-details.json', import.meta.url), 'utf8'));

test('every Atlas country has one valid detail record and no extras', () => {
  assert.equal(countries.length, 197);
  const codes = new Set(countries.map(country => country.code));
  assert.equal(codes.size, countries.length, 'countries.json contains duplicate ISO codes');
  assert.equal(Object.keys(details).length, codes.size, 'detail record count differs from country count');

  for (const code of codes) {
    const detail = getCountryDetail(details, code);
    assert.ok(detail, `missing or malformed detail record: ${code}`);
    assert.ok(detail.sources.length >= 2 && detail.sources.length <= 4, `invalid source count: ${code}`);
  }

  for (const code of Object.keys(details)) {
    assert.ok(codes.has(code), `extra detail record not found in countries.json: ${code}`);
  }
});

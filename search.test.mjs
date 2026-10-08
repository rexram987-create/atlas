import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterCountries } from './search.mjs';
const countries = JSON.parse(readFileSync(new URL('./countries.json', import.meta.url)));

test('finds names without Latin accents and with Hebrew spelling aliases', () => {
  for (const [query, code] of [['Sao Tome', 'ST'], ['Cote dIvoire', 'CI'], ['טאיוואן', 'TW'], ['ארהב', 'US'], ['יִשְׂרָאֵל', 'IL']]) {
    assert.ok(filterCountries(countries, query, 'all').some(country => country.code === code), query);
  }
  assert.equal(filterCountries(countries, 'Sao Tome', 'Europe').length, 0);
});

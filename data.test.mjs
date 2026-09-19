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
    assert.equal(detail.historicalMilestone.year, detail.modernStateYear, `legacy milestone mismatch: ${code}`);
    assert.ok(detail.sources.length >= 2 && detail.sources.length <= 4, `invalid source count: ${code}`);
  }

  for (const code of Object.keys(details)) {
    assert.ok(codes.has(code), `extra detail record not found in countries.json: ${code}`);
  }
});

test('Japan constitution is not labeled as state foundation', () => {
  assert.equal(details.JP.history.constitution.year, 1947);
  assert.equal(details.JP.history.formation, null);
  assert.equal(details.IR.history.constitution.year, 1979);
  assert.equal(details.YE.history.formation.year, 1990);
});

test('Mongolia first history batch has independently sourced milestones', () => {
  const history = details.MN.history;
  assert.deepEqual([history.independence.year, history.formation.year, history.constitution.year, history.nameChange.year], [1911, 1924, 1992, 1992]);
  for (const item of Object.values(history)) assert.ok(item.source.startsWith('https://'));
});

test('history batch 2 separates Italy and Yemen state formation from constitutional dates', () => {
  assert.deepEqual([details.IT.history.formation.year, details.IT.history.constitution.year], [1861, 1948]);
  assert.deepEqual([details.YE.history.formation.year, details.YE.history.constitution.year], [1990, 1991]);
  for (const code of ['IT', 'YE']) for (const key of ['formation', 'constitution']) {
    assert.ok(details[code].history[key].source.startsWith('https://'));
  }
});

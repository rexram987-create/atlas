import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const countries = JSON.parse(read('./countries.json'));

test('every country flag is packaged and precached for offline use', () => {
  const precache = JSON.parse(read('./precache.json'));
  for (const country of countries) {
    const path = `/flags/${country.code.toLowerCase()}.svg`;
    assert.ok(precache.includes(path), `not precached: ${path}`);
    assert.match(read(`.${path}`), /<svg[\s>]/);
  }
  for (const path of precache.filter(path => path !== '/')) assert.ok(read(`.${path}`).length, path);
});

test('bundled facts cover every country even before a successful API request', () => {
  const precache = JSON.parse(read('./precache.json'));
  assert.ok(precache.includes('/country-facts.json'));
  const facts = JSON.parse(read('./country-facts.json'));
  for (const country of countries) {
    const fact = facts.find(item => item.cca2 === country.code);
    assert.ok(fact, country.code);
    assert.ok(Number.isFinite(fact.population), country.code);
    assert.equal(fact.populationYear, 2024);
    assert.ok(fact.populationSource.url.startsWith('https://'));
    assert.ok(Object.keys(fact.currencies).length > 0, `missing currency: ${country.code}`);
    for (const capital of fact.capital) assert.match(fact.capitalNames[capital], /[\u0590-\u05ff]/, `untranslated capital: ${country.code}`);
  }
  const za = facts.find(item => item.cca2 === 'ZA');
  assert.equal(Object.keys(za.languages).length, 12);
  assert.ok(za.languages.sfs);
});

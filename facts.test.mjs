import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCountryFacts, formatPopulation, compactList } from './facts.mjs';

test('normalizes compact facts by ISO alpha-2 code', () => {
  const result = normalizeCountryFacts([
    {
      cca2: 'IL',
      capital: ['Jerusalem'],
      languages: { ara: 'Arabic', heb: 'Hebrew' },
      currencies: { ILS: { name: 'Israeli new shekel', nameHe: 'שקל חדש ישראלי', symbol: '₪' } },
      population: 10305000
    }
  ]);

  assert.deepEqual(result.IL, {
    capital: ['Jerusalem'],
    languages: ['ara', 'heb'],
    currencies: ['ILS'],
    currencyNames: { ILS: 'שקל חדש ישראלי' },
    population: 10305000
  });
});

test('ignores malformed records and keeps safe defaults', () => {
  const result = normalizeCountryFacts([
    null,
    { cca2: 'XX', capital: null, languages: null, currencies: null, population: -1 }
  ]);
  assert.deepEqual(result.XX, { capital: [], languages: [], currencies: [], currencyNames: {}, population: null });
});

test('formats population compactly for Hebrew UI', () => {
  assert.equal(formatPopulation(10305000, 'he-IL'), '10.3 מיליון');
  assert.equal(formatPopulation(450000, 'he-IL'), '450 אלף');
  assert.equal(formatPopulation(null, 'he-IL'), 'לא זמין');
});

test('compacts long lists without hiding how many more values exist', () => {
  assert.equal(compactList(['עברית', 'ערבית'], 2), 'עברית, ערבית');
  assert.equal(compactList(['אנגלית', 'זולו', 'קוסה', 'אפריקאנס'], 2), 'אנגלית, זולו +2');
  assert.equal(compactList([], 2), 'לא זמין');
});

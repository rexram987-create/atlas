import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCountryFacts, formatPopulation, compactList, localizeCapitalList } from './facts.mjs';

test('normalizes compact facts by ISO alpha-2 code', () => {
  const result = normalizeCountryFacts([
    {
      cca2: 'IL',
      capital: ['Jerusalem'],
      capitalNames: { Jerusalem: 'ירושלים' },
      languages: { ara: 'Arabic', heb: 'Hebrew' },
      currencies: { ILS: { name: 'Israeli new shekel', nameHe: 'שקל חדש ישראלי', symbol: '₪' } },
      population: 10305000
    }
  ]);

  assert.deepEqual(result.IL, {
    capital: ['Jerusalem'],
    capitalNames: { Jerusalem: 'ירושלים' },
    languages: ['ara', 'heb'],
    currencies: ['ILS'],
    currencyNames: { ILS: 'שקל חדש ישראלי' },
    population: 10305000
  });
});

test('ignores malformed records and keeps safe defaults', () => {
  const result = normalizeCountryFacts([
    null,
    { cca2: 'XX', capital: null, capitalNames: null, languages: null, currencies: null, population: -1 }
  ]);
  assert.deepEqual(result.XX, { capital: [], capitalNames: {}, languages: [], currencies: [], currencyNames: {}, population: null });
});

test('uses Hebrew capital labels when available and falls back safely', () => {
  assert.deepEqual(
    localizeCapitalList(['Kampala', 'Unknown City'], { Kampala: 'קמפלה' }),
    ['קמפלה', 'Unknown City']
  );
});

test('translates the six capitals missing from the live dataset', () => {
  for (const [code, english, hebrew] of [['US', 'Washington D.C.', 'וושינגטון די. סי.'], ['BS', 'Nassau', 'נסאו'], ['KM', 'Moroni', 'מורוני'], ['GD', "St. George's", 'סנט ג׳ורג׳ס'], ['IS', 'Reykjavik', 'רייקיאוויק'], ['TO', "Nuku'alofa", 'נוקואלופה']]) {
    assert.deepEqual(localizeCapitalList([english], {}, code), [hebrew]);
  }
});

test('preserves population year and source instead of presenting undated numbers', () => {
  const source = { label: 'הבנק העולמי', url: 'https://data.worldbank.org/indicator/SP.POP.TOTL' };
  const fact = normalizeCountryFacts([{ cca2: 'US', population: 340003797, populationYear: 2024, populationSource: source }]).US;
  assert.equal(fact.populationYear, 2024);
  assert.deepEqual(fact.populationSource, source);
});

test('shows Hebrew capital names even when Wikidata and local cache lack them', () => {
  assert.deepEqual(localizeCapitalList(['Sanaa'], {}, 'YE'), ['צנעא']);
  assert.deepEqual(localizeCapitalList(["Sana'a"], {}, 'YE'), ['צנעא']);
  assert.deepEqual(localizeCapitalList(['Amman'], {}, 'JO'), ['עמאן']);
  assert.deepEqual(localizeCapitalList(['Muscat'], {}, 'OM'), ['מסקט']);
  assert.deepEqual(localizeCapitalList(['Astana'], {}, 'KZ'), ['אסטנה']);
  assert.deepEqual(localizeCapitalList(['Ulaanbaatar'], {}, 'MN'), ['אולן בטור']);
  assert.deepEqual(localizeCapitalList(['Ulan Bator'], {}, 'MN'), ['אולן בטור']);
  assert.deepEqual(localizeCapitalList(['Bishkek'], {}, 'KG'), ['בישקק']);
  assert.deepEqual(localizeCapitalList(['Unknown City'], {}, 'XX'), ['Unknown City']);
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

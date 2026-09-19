import test from 'node:test';
import assert from 'node:assert/strict';
import { getCountryDetail, validSources } from './details.mjs';

test('getCountryDetail returns the matching valid record by ISO code', () => {
  const data = {
    IL: {
      etymology: 'מקור השם',
      nameStory: 'סיפור השם',
      modernStateYear: 1948,
      modernStateNote: '',
      historicalMilestone: { year: 1948, note: '' },
      history: { independence: { year: 1948, note: 'הכרזה', source: 'https://example.com' }, formation: null, constitution: null, nameChange: null },
      sources: [{ label: 'Source', url: 'https://example.com' }]
    }
  };
  assert.equal(getCountryDetail(data, 'IL')?.modernStateYear, 1948);
});

test('getCountryDetail returns null for a missing or malformed record', () => {
  assert.equal(getCountryDetail({}, 'IL'), null);
  assert.equal(getCountryDetail({ IL: { modernStateYear: 1948 } }, 'IL'), null);
});

test('validSources drops malformed and non-HTTPS source entries', () => {
  const sources = [
    { label: 'Good', url: 'https://example.com' },
    { label: '', url: 'https://example.com/empty-label' },
    { label: 'HTTP', url: 'http://example.com' },
    null
  ];
  assert.deepEqual(validSources(sources), [{ label: 'Good', url: 'https://example.com' }]);
});

test('validSources preserves source order', () => {
  const sources = [
    { label: 'First', url: 'https://example.com/1' },
    { label: 'Second', url: 'https://example.com/2' }
  ];
  assert.deepEqual(validSources(sources), sources);
});

test('rejects historical dates without category or source', () => {
  const base = { etymology: 'שם', nameStory: 'סיפור', modernStateYear: 1947, modernStateNote: '', historicalMilestone: { year: 1947, note: '' }, sources: [] };
  assert.equal(getCountryDetail({ JP: { ...base, history: { independence: null } } }, 'JP'), null);
  assert.equal(getCountryDetail({ JP: { ...base, history: { independence: null, formation: null, constitution: { year: 1947, note: 'חוקה', source: '' }, nameChange: null } } }, 'JP'), null);
});

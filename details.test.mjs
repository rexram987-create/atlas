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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from './api/country-facts.js';

test('API returns dated populations, official supplements and Hebrew capital fallbacks', async t => {
  const countries = JSON.parse(readFileSync(new URL('./country-facts.json', import.meta.url)));
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('mledoze/countries')) return Response.json(countries);
    if (String(url).includes('api.worldbank.org')) return Response.json([{ pages: 1 }, [{ country: { id: 'US' }, date: '2024', value: 340003797 }]]);
    if (String(url).includes('wikidata.org')) return Response.json({ entities: {} });
    throw new Error(`Unexpected upstream: ${url}`);
  });
  let status, body;
  const response = { setHeader() {}, status(value) { status = value; return this; }, json(value) { body = value; } };
  await handler({ method: 'GET' }, response);
  assert.equal(status, 200);
  const byCode = Object.fromEntries(body.map(record => [record.cca2, record]));
  assert.equal(byCode.US.populationYear, 2024);
  assert.equal(byCode.US.population, 340003797);
  assert.equal(byCode.US.capitalNames['Washington D.C.'], 'וושינגטון די. סי.');
  assert.equal(byCode.TW.population, 23400220);
  assert.equal(byCode.VA.population, 882);
  assert.equal(byCode.VA.populationYear, 2024);
  assert.equal(new URL(byCode.TW.populationSource.url).hostname, 'www.ris.gov.tw');
  assert.equal(byCode.JP.population, null);
  assert.equal(byCode.JP.populationYear, null);
});

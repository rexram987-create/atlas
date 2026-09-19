const COUNTRY_SOURCE = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';
const POPULATION_SOURCE = 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=400&date=2024';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
// Stable Hebrew spellings for capitals whose English Wikipedia titles can differ
// from the names in the country data, or whose Hebrew sitelink is unavailable.
const CAPITAL_OVERRIDES = Object.freeze({
  YE: { Sanaa: 'צנעא', "Sana'a": 'צנעא', 'Sana’a': 'צנעא' },
  JO: { Amman: 'עמאן' },
  OM: { Muscat: 'מסקט' },
  KZ: { Astana: 'אסטנה' },
  MN: { Ulaanbaatar: 'אולן בטור', 'Ulan Bator': 'אולן בטור' },
  KG: { Bishkek: 'בישקק' }
});
const currencyDisplayNames = (() => {
  try { return new Intl.DisplayNames(['he'], { type: 'currency' }); }
  catch { return null; }
})();

async function fetchHebrewCapitalNames(countries) {
  const titles = [...new Set(countries.flatMap(country => Array.isArray(country.capital) ? country.capital : []).filter(Boolean))];
  const names = {};
  const chunks = [];
  for (let index = 0; index < titles.length; index += 40) chunks.push(titles.slice(index, index + 40));

  await Promise.all(chunks.map(async chunk => {
    try {
      const params = new URLSearchParams({
        action: 'wbgetentities',
        format: 'json',
        sites: 'enwiki',
        titles: chunk.join('|'),
        props: 'sitelinks|labels',
        sitefilter: 'enwiki|hewiki',
        languages: 'he',
        origin: '*'
      });
      const result = await fetch(`${WIKIDATA_API}?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Atlas-Countries/1.0' }
      });
      if (!result.ok) return;
      const payload = await result.json();
      for (const entity of Object.values(payload?.entities || {})) {
        const english = entity?.sitelinks?.enwiki?.title;
        const hebrew = entity?.sitelinks?.hewiki?.title || entity?.labels?.he?.value;
        if (english && hebrew) names[english] = hebrew;
      }
    } catch {}
  }));

  return names;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [countriesResponse, populationResponse] = await Promise.all([
      fetch(COUNTRY_SOURCE, { headers: { Accept: 'application/json', 'User-Agent': 'Atlas-Countries/1.0' } }),
      fetch(POPULATION_SOURCE, { headers: { Accept: 'application/json', 'User-Agent': 'Atlas-Countries/1.0' } })
    ]);

    if (!countriesResponse.ok) throw new Error(`Country source returned ${countriesResponse.status}`);
    const countries = await countriesResponse.json();
    if (!Array.isArray(countries) || countries.length < 190) throw new Error('Incomplete country facts response');

    const [capitalNameByEnglish, populationPayload] = await Promise.all([
      fetchHebrewCapitalNames(countries),
      populationResponse.ok ? populationResponse.json() : Promise.resolve(null)
    ]);

    const populationByCode = {};
    const rows = Array.isArray(populationPayload) && Array.isArray(populationPayload[1]) ? populationPayload[1] : [];
    for (const row of rows) {
      const code = typeof row?.country?.id === 'string' ? row.country.id.toUpperCase() : '';
      if (code && Number.isFinite(row?.value)) populationByCode[code] = row.value;
    }

    const compact = countries.map(country => {
      const currencies = {};
      for (const [code, info] of Object.entries(country.currencies || {})) {
        let nameHe = '';
        try {
          const localized = currencyDisplayNames?.of(code);
          if (localized && localized !== code) nameHe = localized;
        } catch {}
        currencies[code] = { ...info, nameHe };
      }

      const capitalNames = {};
      for (const capital of Array.isArray(country.capital) ? country.capital : []) {
        const translated = CAPITAL_OVERRIDES[country.cca2]?.[capital] || capitalNameByEnglish[capital];
        if (translated) capitalNames[capital] = translated;
      }

      return {
        cca2: country.cca2,
        capital: country.capital,
        capitalNames,
        languages: country.languages,
        currencies,
        population: populationByCode[country.cca2] ?? null
      };
    });

    response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return response.status(200).json(compact);
  } catch (error) {
    console.error('country-facts proxy failed', error);
    return response.status(502).json({ error: 'Country facts unavailable' });
  }
}

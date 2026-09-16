const COUNTRY_SOURCE = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';
const POPULATION_SOURCE = 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=400&date=2024';

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

    const populationByCode = {};
    if (populationResponse.ok) {
      const payload = await populationResponse.json();
      const rows = Array.isArray(payload) && Array.isArray(payload[1]) ? payload[1] : [];
      for (const row of rows) {
        const code = typeof row?.country?.id === 'string' ? row.country.id.toUpperCase() : '';
        if (code && Number.isFinite(row?.value)) populationByCode[code] = row.value;
      }
    }

    const compact = countries.map(country => ({
      cca2: country.cca2,
      capital: country.capital,
      languages: country.languages,
      currencies: country.currencies,
      population: populationByCode[country.cca2] ?? null
    }));

    response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return response.status(200).json(compact);
  } catch (error) {
    console.error('country-facts proxy failed', error);
    return response.status(502).json({ error: 'Country facts unavailable' });
  }
}

const SOURCE = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const upstream = await fetch(SOURCE, {
      headers: { Accept: 'application/json', 'User-Agent': 'Atlas-Countries/1.0' }
    });
    if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);
    const data = await upstream.json();
    if (!Array.isArray(data) || data.length < 190) throw new Error('Incomplete country facts response');

    const compact = data.map(country => ({
      cca2: country.cca2,
      capital: country.capital,
      languages: country.languages,
      currencies: country.currencies,
      population: country.population
    }));

    response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return response.status(200).json(compact);
  } catch (error) {
    console.error('country-facts proxy failed', error);
    return response.status(502).json({ error: 'Country facts unavailable' });
  }
}

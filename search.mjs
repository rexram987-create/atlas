export const normalize = value => value.normalize('NFKD').replace(/[\u0591-\u05C7]/g, '').replace(/[״׳'"’]/g, '').trim().toLocaleLowerCase();
export function filterCountries(countries, query, continent) {
  const needle = normalize(query);
  return countries.filter(c => (continent === 'all' || c.continent === continent) &&
    [c.name, c.english, c.code, ...(c.aliases || [])].some(value => normalize(value).includes(needle)));
}

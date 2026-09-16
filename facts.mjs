export function normalizeCountryFacts(records) {
  const byCode = {};
  if (!Array.isArray(records)) return byCode;

  for (const record of records) {
    const code = typeof record?.cca2 === 'string' ? record.cca2.trim().toUpperCase() : '';
    if (!code) continue;
    const capital = Array.isArray(record.capital) ? record.capital.filter(value => typeof value === 'string' && value.trim()) : [];
    const languages = record.languages && typeof record.languages === 'object' ? Object.keys(record.languages) : [];
    const currencies = record.currencies && typeof record.currencies === 'object' ? Object.keys(record.currencies) : [];
    const population = Number.isFinite(record.population) && record.population >= 0 ? Math.round(record.population) : null;
    byCode[code] = { capital, languages, currencies, population };
  }

  return byCode;
}

export function formatPopulation(population, locale = 'he-IL') {
  if (!Number.isFinite(population) || population < 0) return 'לא זמין';
  if (population >= 1_000_000) {
    const value = population / 1_000_000;
    const digits = value >= 100 ? 0 : 1;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} מיליון`;
  }
  if (population >= 1_000) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(population / 1_000)} אלף`;
  }
  return new Intl.NumberFormat(locale).format(population);
}

export function compactList(values, max = 2) {
  const clean = Array.isArray(values) ? values.filter(value => typeof value === 'string' && value.trim()) : [];
  if (!clean.length) return 'לא זמין';
  if (clean.length <= max) return clean.join(', ');
  return `${clean.slice(0, max).join(', ')} +${clean.length - max}`;
}

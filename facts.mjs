export function normalizeCountryFacts(records) {
  const byCode = {};
  if (!Array.isArray(records)) return byCode;

  for (const record of records) {
    const code = typeof record?.cca2 === 'string' ? record.cca2.trim().toUpperCase() : '';
    if (!code) continue;
    const capital = Array.isArray(record.capital) ? record.capital.filter(value => typeof value === 'string' && value.trim()) : [];
    const capitalNames = record.capitalNames && typeof record.capitalNames === 'object'
      ? Object.fromEntries(Object.entries(record.capitalNames).filter(([key, value]) => typeof key === 'string' && key.trim() && typeof value === 'string' && value.trim()).map(([key, value]) => [key.trim(), value.trim()]))
      : {};
    const languages = record.languages && typeof record.languages === 'object' ? Object.keys(record.languages) : [];
    const currencies = record.currencies && typeof record.currencies === 'object' ? Object.keys(record.currencies) : [];
    const currencyNames = Object.fromEntries(currencies.map(currencyCode => {
      const info = record.currencies?.[currencyCode];
      const name = typeof info?.nameHe === 'string' && info.nameHe.trim()
        ? info.nameHe.trim()
        : (typeof info?.name === 'string' && info.name.trim() ? info.name.trim() : currencyCode);
      return [currencyCode, name];
    }));
    const population = Number.isFinite(record.population) && record.population >= 0 ? Math.round(record.population) : null;
    byCode[code] = { capital, capitalNames, languages, currencies, currencyNames, population };
  }

  return byCode;
}

const HEBREW_CAPITAL_FALLBACKS = Object.freeze({
  YE: { Sanaa: 'צנעא', "Sana'a": 'צנעא', 'Sana’a': 'צנעא' },
  JO: { Amman: 'עמאן' },
  OM: { Muscat: 'מסקט' },
  KZ: { Astana: 'אסטנה' },
  MN: { Ulaanbaatar: 'אולן בטור', 'Ulan Bator': 'אולן בטור' },
  KG: { Bishkek: 'בישקק' }
});

export function localizeCapitalList(capitals, capitalNames = {}, countryCode = '') {
  if (!Array.isArray(capitals)) return [];
  return capitals.map(capital => HEBREW_CAPITAL_FALLBACKS[countryCode]?.[capital] || capitalNames?.[capital] || capital);
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

// Curated corrections apply to both the offline snapshot and refreshed upstream data.
// Sources are displayed alongside the facts rather than only in the general bibliography.
export function applyCountryFactCorrections(record) {
  const code = typeof record?.cca2 === 'string' ? record.cca2.trim().toUpperCase() : '';
  if (code === 'FM') return { ...record,
    currencies: { ...record.currencies, USD: { name: 'United States dollar', nameHe: 'דולר אמריקאי', symbol: '$' } },
    factNotes: [{ text: 'המטבע הרשמי הוא דולר אמריקאי.', label: 'לשכת התיירות של מיקרונזיה', url: 'https://visit-micronesia.fm/general-information/' }]
  };
  if (code === 'ZA') return { ...record,
    languages: { ...record.languages, sfs: 'South African Sign Language' },
    languageNames: { ...record.languageNames, afr: 'אפריקאנס', eng: 'אנגלית', nbl: 'נדבלה דרומית', nso: 'סותו צפונית', sot: 'סותו דרומית', ssw: 'סוואזי', tsn: 'סוואנה', tso: 'טסונגה', ven: 'ונדה', xho: 'קוסה', zul: 'זולו', sfs: 'שפת הסימנים הדרום־אפריקאית' },
    factNotes: [{ text: 'שפת הסימנים הדרום־אפריקאית הוכרה כשפה הרשמית ה־12 ב־19 ביולי 2023.', label: 'ממשלת דרום אפריקה', url: 'https://www.gov.za/news/speeches/president-cyril-ramaphosa-signing-ceremony-south-african-sign-language-bill-19-jul' }]
  };
  if (code === 'IL') return { ...record,
    factNotes: [{ text: 'עברית היא שפת המדינה; לערבית מעמד מיוחד. חוק היסוד אינו פוגע במעמד שניתן לערבית לפני תחילתו.', label: 'הכנסת — חוק יסוד: ישראל, סעיף 4', url: 'https://main.knesset.gov.il/EN/News/PressReleases/Pages/Pr13978_pg.aspx' }]
  };
  return record;
}

export function normalizeCountryFacts(records) {
  const byCode = {};
  if (!Array.isArray(records)) return byCode;

  for (const input of records) {
    const record = applyCountryFactCorrections(input);
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
    if (record.languageNames && typeof record.languageNames === 'object') {
      byCode[code].languageNames = Object.fromEntries(Object.entries(record.languageNames).filter(([key, value]) => languages.includes(key) && typeof value === 'string' && value.trim()));
    }
    const notes = Array.isArray(record.factNotes) ? record.factNotes.filter(note => typeof note?.text === 'string' && note.text.trim() && typeof note.label === 'string' && note.label.trim() && typeof note.url === 'string' && note.url.startsWith('https://')) : [];
    if (notes.length) byCode[code].factNotes = notes;
    if (population !== null && Number.isInteger(record.populationYear)) {
      byCode[code].populationYear = record.populationYear;
      if (typeof record.populationSource?.label === 'string' && typeof record.populationSource?.url === 'string' && record.populationSource.url.startsWith('https://')) {
        byCode[code].populationSource = record.populationSource;
      }
    }
  }

  return byCode;
}

const HEBREW_CAPITAL_FALLBACKS = Object.freeze({
  YE: { Sanaa: 'צנעא', "Sana'a": 'צנעא', 'Sana’a': 'צנעא' },
  JO: { Amman: 'עמאן' },
  OM: { Muscat: 'מסקט' },
  KZ: { Astana: 'אסטנה' },
  MN: { Ulaanbaatar: 'אולן בטור', 'Ulan Bator': 'אולן בטור' },
  KG: { Bishkek: 'בישקק' },
  US: { 'Washington D.C.': 'וושינגטון די. סי.' },
  BS: { Nassau: 'נסאו' },
  KM: { Moroni: 'מורוני' },
  GD: { "St. George's": 'סנט ג׳ורג׳ס' },
  IS: { Reykjavik: 'רייקיאוויק' },
  TO: { "Nuku'alofa": 'נוקואלופה' }
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

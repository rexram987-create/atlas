import { filterCountries } from './search.mjs';
import { getCountryDetail } from './details.mjs';
import { compactList, formatPopulation, normalizeCountryFacts } from './facts.mjs';

const labels = { all: 'כל העולם', Asia: 'אסיה', Europe: 'אירופה', Africa: 'אפריקה', 'North America': 'אמריקה הצפונית', 'South America': 'אמריקה הדרומית', Oceania: 'אוקיאניה', Antarctica: 'אנטארקטיקה' };
const FACTS_URL = '/api/country-facts';
const FACTS_CACHE_KEY = 'atlas-country-facts-v2';
const FACTS_MAX_AGE = 24 * 60 * 60 * 1000;
const $ = id => document.getElementById(id);
const languageNames = (() => { try { return new Intl.DisplayNames(['he'], { type: 'language' }); } catch { return null; } })();
const currencyNames = (() => { try { return new Intl.DisplayNames(['he'], { type: 'currency' }); } catch { return null; } })();
let countries = [], countryDetails = {}, countryFacts = {}, selected = 'all', installPrompt, dialogOrigin = null, dialogCountry = null, factsAttempted = false;
const localFlag = code => `/flags/${code.toLowerCase()}.svg`;
const remoteFlag = code => `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.5.0/flags/4x3/${code.toLowerCase()}.svg`;

function readFactsCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(FACTS_CACHE_KEY));
    if (cached?.facts && typeof cached.facts === 'object') {
      factsAttempted = true;
      return cached;
    }
  } catch {}
  return null;
}

const cachedFacts = readFactsCache();
if (cachedFacts) countryFacts = cachedFacts.facts;

function localizeLanguage(code) {
  try { return languageNames?.of(code) || code; } catch { return code; }
}

function localizeCurrency(code, fallbackNames = {}) {
  try {
    const name = currencyNames?.of(code);
    if (name && name !== code) return `${name} (${code})`;
  } catch {}
  const fallback = fallbackNames?.[code];
  return fallback && fallback !== code ? `${fallback} (${code})` : code;
}

function setFact(id, value, fullValue = value) {
  const element = $(id);
  element.textContent = value;
  element.setAttribute('aria-label', fullValue || value);
}

function renderCountryFacts(code) {
  const fact = countryFacts[code];
  if (!fact) {
    const value = factsAttempted ? 'לא זמין' : 'טוען…';
    for (const id of ['country-fact-capital','country-fact-languages','country-fact-currency','country-fact-population']) setFact(id, value);
    return;
  }

  const capitals = fact.capital.length ? fact.capital : ['לא זמין'];
  const languages = fact.languages.map(localizeLanguage);
  const currencies = fact.currencies.map(currencyCode => localizeCurrency(currencyCode, fact.currencyNames));
  setFact('country-fact-capital', compactList(capitals, 2), capitals.join(', '));
  setFact('country-fact-languages', compactList(languages, 2), languages.join(', ') || 'לא זמין');
  setFact('country-fact-currency', compactList(currencies, 1), currencies.join(', ') || 'לא זמין');
  const population = formatPopulation(fact.population);
  setFact('country-fact-population', fact.population == null ? population : `≈ ${population}`, population);
}

async function refreshCountryFacts() {
  if (cachedFacts && Date.now() - Number(cachedFacts.updatedAt || 0) < FACTS_MAX_AGE) return;
  try {
    const response = await fetch(FACTS_URL, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Country facts unavailable');
    const normalized = normalizeCountryFacts(await response.json());
    if (Object.keys(normalized).length < 190) throw new Error('Country facts incomplete');
    countryFacts = normalized;
    localStorage.setItem(FACTS_CACHE_KEY, JSON.stringify({ updatedAt: Date.now(), facts: normalized }));
  } catch {
    // Keep the last successfully cached facts when offline or if the public data source is unavailable.
  } finally {
    factsAttempted = true;
    if (dialogCountry && $('country-dialog').open) renderCountryFacts(dialogCountry.code);
  }
}

function closeCountryDialog() {
  const dialog = $('country-dialog');
  if (dialog.open) dialog.close();
}

function openCountryDialog(country, originElement) {
  dialogOrigin = originElement;
  dialogCountry = country;
  const detail = getCountryDetail(countryDetails, country.code);
  const flag = $('country-dialog-flag');
  flag.src = localFlag(country.code);
  flag.alt = `דגל ${country.name}`;
  flag.onerror = () => { flag.onerror = null; flag.src = remoteFlag(country.code); };
  $('country-dialog-title').textContent = country.name;
  $('country-dialog-english').textContent = country.english;
  $('country-dialog-code').textContent = country.code;
  renderCountryFacts(country.code);
  $('country-detail-content').hidden = !detail;
  $('country-detail-unavailable').hidden = Boolean(detail);
  if (detail) {
    $('country-detail-etymology').textContent = detail.etymology;
    $('country-detail-name-story').textContent = detail.nameStory;
    $('country-detail-year').textContent = String(detail.modernStateYear);
    $('country-detail-year-note').textContent = detail.modernStateNote;
    $('country-detail-year-note').hidden = !detail.modernStateNote;
    const items = detail.sources.map(source => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = source.url;
      a.textContent = source.label;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      li.append(a);
      return li;
    });
    $('country-detail-sources').replaceChildren(...items);
    $('country-detail-sources').closest('details').hidden = items.length === 0;
  } else {
    $('country-detail-sources').replaceChildren();
  }
  $('country-dialog').showModal();
  $('country-dialog-close').focus();
}

function render() {
  const found = filterCountries(countries, $('search').value, selected);
  $('count').textContent = found.length;
  $('results-title').firstChild.textContent = selected === 'all' ? 'כל מדינות העולם ' : `מדינות ${labels[selected]} `;
  $('status').textContent = `${found.length} מדינות נמצאו`;
  $('countries').replaceChildren(...found.map(c => {
    const article = document.createElement('article'); article.className = 'country-card';
    article.tabIndex = 0;
    article.setAttribute('role', 'button');
    article.setAttribute('aria-label', `פתיחת פרטים על ${c.name}`);
    article.addEventListener('click', () => openCountryDialog(c, article));
    article.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCountryDialog(c, article);
      }
    });
    const top = document.createElement('div'); top.className = 'card-top';
    const flag = document.createElement('img'); flag.src = localFlag(c.code); flag.alt = `דגל ${c.name}`; flag.className = 'flag'; flag.width = 55; flag.height = 38; flag.loading = 'lazy';
    flag.addEventListener('error', () => { if (flag.src !== remoteFlag(c.code)) flag.src = remoteFlag(c.code); }, { once: true });
    const code = document.createElement('span'); code.className = 'code'; code.textContent = c.code; code.lang = 'en';
    top.append(flag, code);
    const title = document.createElement('h3'); title.textContent = c.name;
    const english = document.createElement('p'); english.className = 'english'; english.lang = 'en'; english.textContent = c.english;
    const continent = document.createElement('span'); continent.className = 'continent-label'; continent.textContent = labels[c.continent];
    article.append(top, title, english, continent); return article;
  }));
  $('empty').hidden = found.length > 0;
  $('empty-title').textContent = selected === 'Antarctica' ? 'יבשת של טבע, בלי מדינות' : 'לא מצאנו מדינה מתאימה';
  $('empty-message').textContent = selected === 'Antarctica' ? 'באנטארקטיקה אין מדינות ריבוניות. אפשר להמשיך לגלות את שאר העולם.' : 'נסו שם אחר, חיפוש באנגלית או בחירה ביבשת אחרת.';
  for (const b of $('continents').children) b.setAttribute('aria-pressed', b.dataset.continent === selected);
}
function reset() { selected = 'all'; $('search').value = ''; render(); $('search').focus(); }
$('search').addEventListener('input', render); $('reset').addEventListener('click', reset);
document.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName) && !$('install-dialog').open && !$('country-dialog').open) { e.preventDefault(); $('search').focus(); } });
async function install() {
  if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; }
  else { $('install-dialog').showModal(); }
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
window.addEventListener('appinstalled', () => { $('install').textContent = 'היישומון מותקן'; installPrompt = null; });
$('install').addEventListener('click', install); $('install-bottom').addEventListener('click', install);
$('close-dialog').addEventListener('click', () => $('install-dialog').close());
$('country-dialog-close').addEventListener('click', closeCountryDialog);
$('country-dialog').addEventListener('click', event => {
  if (event.target === $('country-dialog')) closeCountryDialog();
});
$('country-dialog').addEventListener('close', () => {
  dialogCountry = null;
  if (dialogOrigin) {
    const origin = dialogOrigin;
    dialogOrigin = null;
    origin.focus();
  }
});
try {
  const response = await fetch('/countries.json'); if (!response.ok) throw new Error('Data unavailable');
  countries = await response.json(); countries.sort((a,b) => a.name.localeCompare(b.name, 'he'));
  try {
    const detailsResponse = await fetch('/country-details.json');
    if (detailsResponse.ok) countryDetails = await detailsResponse.json();
  } catch {
    countryDetails = {};
  }
  $('total').textContent = countries.length;
  for (const [key, name] of Object.entries(labels)) {
    const button = document.createElement('button'); button.className = 'continent'; button.dataset.continent = key; button.textContent = name;
    const count = document.createElement('span'); count.textContent = key === 'all' ? countries.length : countries.filter(c=>c.continent===key).length; button.append(count);
    button.addEventListener('click', () => { selected = key; render(); }); $('continents').append(button);
  }
  render();
  refreshCountryFacts();
} catch { $('load-error').hidden = false; }
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    const ready = () => { $('offline-status').textContent = 'קובצי הליבה והמדינות מוכנים לשימוש ללא אינטרנט.'; };
    if (reg.active) ready();
    reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'activated') ready(); }); });
    navigator.serviceWorker.ready.then(ready);
  }).catch(() => { $('offline-status').textContent = 'הגלישה זמינה. לא ניתן היה להכין שימוש לא מקוון בדפדפן זה.'; });
}

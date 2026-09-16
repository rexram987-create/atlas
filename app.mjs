import { filterCountries } from './search.mjs';
const labels = { all: 'כל העולם', Asia: 'אסיה', Europe: 'אירופה', Africa: 'אפריקה', 'North America': 'אמריקה הצפונית', 'South America': 'אמריקה הדרומית', Oceania: 'אוקיאניה', Antarctica: 'אנטארקטיקה' };
const $ = id => document.getElementById(id);
let countries = [], selected = 'all', installPrompt;
const localFlag = code => `/flags/${code.toLowerCase()}.svg`;
const remoteFlag = code => `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.5.0/flags/4x3/${code.toLowerCase()}.svg`;
function render() {
  const found = filterCountries(countries, $('search').value, selected);
  $('count').textContent = found.length;
  $('results-title').firstChild.textContent = selected === 'all' ? 'כל מדינות העולם ' : `מדינות ${labels[selected]} `;
  $('status').textContent = `${found.length} מדינות נמצאו`;
  $('countries').replaceChildren(...found.map(c => {
    const article = document.createElement('article'); article.className = 'country-card';
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
document.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName) && !$('install-dialog').open) { e.preventDefault(); $('search').focus(); } });
async function install() {
  if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; }
  else { $('install-dialog').showModal(); }
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
window.addEventListener('appinstalled', () => { $('install').textContent = 'היישומון מותקן'; installPrompt = null; });
$('install').addEventListener('click', install); $('install-bottom').addEventListener('click', install);
$('close-dialog').addEventListener('click', () => $('install-dialog').close());
try {
  const response = await fetch('/countries.json'); if (!response.ok) throw new Error('Data unavailable');
  countries = await response.json(); countries.sort((a,b) => a.name.localeCompare(b.name, 'he'));
  $('total').textContent = countries.length;
  for (const [key, name] of Object.entries(labels)) {
    const button = document.createElement('button'); button.className = 'continent'; button.dataset.continent = key; button.textContent = name;
    const count = document.createElement('span'); count.textContent = key === 'all' ? countries.length : countries.filter(c=>c.continent===key).length; button.append(count);
    button.addEventListener('click', () => { selected = key; render(); }); $('continents').append(button);
  }
  render();
} catch { $('load-error').hidden = false; }
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    const ready = () => { $('offline-status').textContent = 'קובצי הליבה והמדינות מוכנים לשימוש ללא אינטרנט.'; };
    if (reg.active) ready();
    reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'activated') ready(); }); });
    navigator.serviceWorker.ready.then(ready);
  }).catch(() => { $('offline-status').textContent = 'הגלישה זמינה. לא ניתן היה להכין שימוש לא מקוון בדפדפן זה.'; });
}

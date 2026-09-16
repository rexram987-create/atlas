# Country Detail Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accessible floating country detail cards to Atlas, backed by a separate verified country-details dataset with concise etymology, name-history context, modern-state founding year, and 2–4 source links per country.

**Architecture:** Keep `countries.json` unchanged for fast search/filtering. Add `country-details.json` keyed by ISO code, load it once at startup, and open a dedicated `<dialog>` from each country card. Cache the detail dataset and updated UI assets under a new Service Worker cache version `atlas-v3` so installed PWAs receive the new feature and data offline after one successful update.

**Tech Stack:** Static HTML, CSS, vanilla ES modules, JSON, Web App Manifest, Service Worker Cache API, Vercel static deployment.

**Spec:** `docs/superpowers/specs/2026-09-16-country-detail-cards-design.md`

## Global Constraints

- Preserve the existing dark visual language and current search/filter/install behavior.
- `countries.json` remains the lightweight base dataset and is not expanded with historical fields.
- `country-details.json` is keyed by ISO country code.
- Detail text is concise Hebrew, normally 3–5 rendered lines per content section.
- `modernStateYear` means founding/establishment year of the modern state, with `modernStateNote` used when one year needs context.
- Each completed country record has 2–4 verified direct source links.
- Country details must remain usable offline after a successful Service Worker update; external source links themselves require internet access.
- Missing or malformed detail data must never break the base Atlas experience.
- Country dialogs must be keyboard accessible, screen-reader accessible, responsive, and close via button, Escape, or backdrop click.
- Populate production data only from verified sources; do not auto-fill all 197 countries from a single unreviewed source or generated guesswork.

---

### Task 1: Add a Testable Detail-Data Helper Module

**Files:**
- Create: `details.mjs`
- Create: `details.test.mjs`

**Interfaces:**
- Produces: `getCountryDetail(detailsByCode, code)` → validated detail object or `null`.
- Produces: `validSources(sources)` → array containing only entries with non-empty `label` and `https://` URL.
- Later tasks import these helpers from `./details.mjs`.

- [ ] **Step 1: Write the failing unit tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getCountryDetail, validSources } from './details.mjs';

test('getCountryDetail returns the matching valid record by ISO code', () => {
  const data = {
    IL: {
      etymology: 'מקור השם',
      nameStory: 'סיפור השם',
      modernStateYear: 1948,
      modernStateNote: '',
      sources: [{ label: 'Source', url: 'https://example.com' }]
    }
  };
  assert.equal(getCountryDetail(data, 'IL')?.modernStateYear, 1948);
});

test('getCountryDetail returns null for a missing or malformed record', () => {
  assert.equal(getCountryDetail({}, 'IL'), null);
  assert.equal(getCountryDetail({ IL: { modernStateYear: 1948 } }, 'IL'), null);
});

test('validSources drops malformed and non-HTTPS source entries', () => {
  const sources = [
    { label: 'Good', url: 'https://example.com' },
    { label: '', url: 'https://example.com/empty-label' },
    { label: 'HTTP', url: 'http://example.com' },
    null
  ];
  assert.deepEqual(validSources(sources), [{ label: 'Good', url: 'https://example.com' }]);
});
```

- [ ] **Step 2: Run the tests and verify the intended failure**

Run: `node --test details.test.mjs`

Expected: FAIL because `details.mjs` does not exist yet.

- [ ] **Step 3: Implement the minimal helper module**

```js
export function validSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.filter(source => source &&
    typeof source.label === 'string' && source.label.trim() &&
    typeof source.url === 'string' && source.url.startsWith('https://'));
}

export function getCountryDetail(detailsByCode, code) {
  const detail = detailsByCode?.[code];
  if (!detail || typeof detail !== 'object') return null;
  if (typeof detail.etymology !== 'string' || !detail.etymology.trim()) return null;
  if (typeof detail.nameStory !== 'string' || !detail.nameStory.trim()) return null;
  if (!Number.isInteger(detail.modernStateYear)) return null;
  if (typeof detail.modernStateNote !== 'string') return null;
  return { ...detail, sources: validSources(detail.sources) };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `node --test details.test.mjs`

Expected: PASS, 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add details.mjs details.test.mjs
git commit -m "Add country detail data helpers"
```

### Task 2: Add the Dedicated Accessible Country Dialog

**Files:**
- Modify: `index.html`
- Modify: `style.css`

**Interfaces:**
- Produces dialog IDs consumed by `app.mjs`: `country-dialog`, `country-dialog-close`, `country-dialog-flag`, `country-dialog-title`, `country-dialog-english`, `country-dialog-code`, `country-detail-etymology`, `country-detail-name-story`, `country-detail-year`, `country-detail-year-note`, `country-detail-sources`, `country-detail-unavailable`.

- [ ] **Step 1: Add the dialog markup after the existing install dialog**

Use this exact structural contract:

```html
<dialog id="country-dialog" class="country-dialog" aria-labelledby="country-dialog-title">
  <button class="close" id="country-dialog-close" aria-label="סגירת פרטי המדינה">×</button>
  <header class="country-dialog-head">
    <img id="country-dialog-flag" class="country-dialog-flag" alt="" width="80" height="54">
    <div>
      <h2 id="country-dialog-title"></h2>
      <p id="country-dialog-english" class="country-dialog-english" lang="en"></p>
      <span id="country-dialog-code" class="country-dialog-code" lang="en"></span>
    </div>
  </header>
  <div id="country-detail-content">
    <section class="detail-section"><h3>אטימולוגיה</h3><p id="country-detail-etymology"></p></section>
    <section class="detail-section"><h3>איך התקבל השם</h3><p id="country-detail-name-story"></p></section>
    <section class="detail-section"><h3>הקמת המדינה המודרנית</h3><p><strong id="country-detail-year"></strong></p><p id="country-detail-year-note" class="muted"></p></section>
    <details class="detail-sources"><summary>מקורות</summary><ul id="country-detail-sources"></ul></details>
  </div>
  <p id="country-detail-unavailable" class="detail-unavailable" hidden>המידע המורחב למדינה זו אינו זמין כרגע.</p>
</dialog>
```

- [ ] **Step 2: Add dark responsive styling**

Add styles that satisfy these measurable constraints:

```css
.country-card{cursor:pointer}
.country-card:focus-visible{outline:3px solid #e7b45d;outline-offset:4px}
.country-dialog{max-width:680px;max-height:min(86vh,760px);overflow:auto}
.country-dialog-head{display:flex;align-items:center;gap:18px;margin-bottom:24px;padding-left:36px}
.country-dialog-flag{width:80px;height:54px;object-fit:contain;flex:0 0 auto}
.country-dialog-english,.country-dialog-code{color:#8fa7a2}
.detail-section{padding:18px 0;border-top:1px solid var(--line)}
.detail-section h3{margin:0 0 8px;color:var(--green);font-size:15px}
.detail-section p{margin:0;line-height:1.8}
.detail-sources{border-top:1px solid var(--line);padding-top:16px}
.detail-sources li+li{margin-top:8px}
.detail-sources a{color:var(--green);text-underline-offset:3px}
.detail-unavailable{padding:18px;border:1px dashed #315961;border-radius:12px;color:#a9bdb8}
@media(max-width:650px){.country-dialog{width:calc(100% - 20px);max-height:88vh;padding:28px 20px}.country-dialog-head{align-items:flex-start}.country-dialog-flag{width:64px;height:44px}}
```

- [ ] **Step 3: Verify static accessibility wiring**

Check manually in source that:
- `country-dialog` has `aria-labelledby="country-dialog-title"`.
- The close control is a real button with a meaningful Hebrew `aria-label`.
- All informational sections use real headings.
- Source links will be standard anchors.

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "Add accessible country detail dialog"
```

### Task 3: Make Country Cards Interactive and Wire Dialog Behavior

**Files:**
- Modify: `app.mjs`
- Modify: `details.test.mjs`

**Interfaces:**
- Consumes: `getCountryDetail` and `validSources` from `./details.mjs`.
- Consumes dialog IDs created in Task 2.
- Produces: `openCountryDialog(country, originElement)` and `closeCountryDialog()` inside `app.mjs`.

- [ ] **Step 1: Add a focused test for source sanitization behavior used by the dialog**

Append:

```js
test('validSources preserves source order', () => {
  const sources = [
    { label: 'First', url: 'https://example.com/1' },
    { label: 'Second', url: 'https://example.com/2' }
  ];
  assert.deepEqual(validSources(sources), sources);
});
```

- [ ] **Step 2: Run tests and verify the new test passes without changing production behavior**

Run: `node --test details.test.mjs`

Expected: PASS, 4 tests, 0 failures. This confirms the helper contract before UI integration.

- [ ] **Step 3: Import the helpers and add dialog state**

At the top of `app.mjs`:

```js
import { filterCountries } from './search.mjs';
import { getCountryDetail } from './details.mjs';
```

Change state to:

```js
let countries = [], countryDetails = {}, selected = 'all', installPrompt, dialogOrigin = null;
```

- [ ] **Step 4: Add dialog open/close functions**

Implement behavior with this contract:

```js
function closeCountryDialog() {
  const dialog = $('country-dialog');
  if (dialog.open) dialog.close();
  dialogOrigin?.focus();
  dialogOrigin = null;
}

function openCountryDialog(country, originElement) {
  dialogOrigin = originElement;
  const detail = getCountryDetail(countryDetails, country.code);
  const flag = $('country-dialog-flag');
  flag.src = localFlag(country.code);
  flag.alt = `דגל ${country.name}`;
  flag.onerror = () => { flag.onerror = null; flag.src = remoteFlag(country.code); };
  $('country-dialog-title').textContent = country.name;
  $('country-dialog-english').textContent = country.english;
  $('country-dialog-code').textContent = country.code;

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
```

- [ ] **Step 5: Turn each rendered country card into an accessible interactive control**

Inside `render()`, after creating `article`:

```js
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
```

- [ ] **Step 6: Wire all close mechanisms**

```js
$('country-dialog-close').addEventListener('click', closeCountryDialog);
$('country-dialog').addEventListener('click', event => {
  if (event.target === $('country-dialog')) closeCountryDialog();
});
$('country-dialog').addEventListener('close', () => {
  if (dialogOrigin) {
    const origin = dialogOrigin;
    dialogOrigin = null;
    origin.focus();
  }
});
```

Do not add a custom Escape listener; native `<dialog>` Escape behavior triggers `close` and therefore returns focus correctly.

- [ ] **Step 7: Update the global `/` shortcut guard**

Change the existing keyboard shortcut condition so `/` does not focus search while either dialog is open:

```js
if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName) && !$('install-dialog').open && !$('country-dialog').open)
```

- [ ] **Step 8: Commit**

```bash
git add app.mjs details.test.mjs
git commit -m "Wire interactive country detail cards"
```

### Task 4: Load Detail Data Without Breaking the Base App

**Files:**
- Create: `country-details.json`
- Modify: `app.mjs`

**Interfaces:**
- Produces: startup-loaded `countryDetails` object.
- Base `countries.json` loading remains mandatory; `country-details.json` loading is optional/fault-tolerant.

- [ ] **Step 1: Create a small structurally valid sample dataset**

Start with only three verified sample records so the end-to-end mechanism can be tested before the full 197-country research pass. Use the exact schema:

```json
{
  "IL": {
    "etymology": "The verified concise Hebrew etymology for Israel.",
    "nameStory": "The verified concise Hebrew account of how the modern state's name was adopted.",
    "modernStateYear": 1948,
    "modernStateNote": "The verified concise note explaining the chosen modern-state year where useful.",
    "sources": [
      {"label": "Verified source 1", "url": "https://verified.example/1"},
      {"label": "Verified source 2", "url": "https://verified.example/2"}
    ]
  },
  "JP": {
    "etymology": "Verified concise Hebrew text.",
    "nameStory": "Verified concise Hebrew text.",
    "modernStateYear": 1947,
    "modernStateNote": "Verified concise note describing why this year represents the modern constitutional state.",
    "sources": [
      {"label": "Verified source 1", "url": "https://verified.example/1"},
      {"label": "Verified source 2", "url": "https://verified.example/2"}
    ]
  },
  "BR": {
    "etymology": "Verified concise Hebrew text.",
    "nameStory": "Verified concise Hebrew text.",
    "modernStateYear": 1822,
    "modernStateNote": "Verified concise note.",
    "sources": [
      {"label": "Verified source 1", "url": "https://verified.example/1"},
      {"label": "Verified source 2", "url": "https://verified.example/2"}
    ]
  }
}
```

Important: before committing this file, replace every `verified.example` URL and every placeholder sentence with actually researched material from the approved source hierarchy. No placeholder text may reach production.

- [ ] **Step 2: Change startup loading to fetch both datasets with different failure semantics**

Use this pattern:

```js
try {
  const response = await fetch('/countries.json');
  if (!response.ok) throw new Error('Data unavailable');
  countries = await response.json();

  try {
    const detailResponse = await fetch('/country-details.json');
    if (detailResponse.ok) countryDetails = await detailResponse.json();
  } catch {
    countryDetails = {};
  }

  countries.sort((a,b) => a.name.localeCompare(b.name, 'he'));
  // existing UI initialization continues unchanged
} catch {
  $('load-error').hidden = false;
}
```

- [ ] **Step 3: Manually verify fallback behavior in a local/static preview**

Checks:
- With valid `country-details.json`, IL/JP/BR show their detail content.
- A country absent from the sample dataset still opens the dialog and shows the unavailable message.
- Temporarily renaming `country-details.json` does not break country search, filters, or base card rendering.

- [ ] **Step 4: Commit**

```bash
git add country-details.json app.mjs
git commit -m "Load country detail dataset with fallback"
```

### Task 5: Make the Feature Offline-Safe and Force Installed-PWA Refresh

**Files:**
- Modify: `precache.json`
- Modify: `sw.js`

**Interfaces:**
- `precache.json` must include `/details.mjs` and `/country-details.json` in addition to existing assets.
- `sw.js` cache name becomes exactly `atlas-v3`.

- [ ] **Step 1: Update the precache manifest**

The resulting array must contain at least:

```json
["/","/index.html","/style.css","/app.mjs","/details.mjs","/search.mjs","/countries.json","/country-details.json","/manifest.webmanifest","/icon.svg","/icons/icon-192.png","/icons/icon-512.png"]
```

- [ ] **Step 2: Bump Service Worker cache version**

Change only:

```js
const CACHE = 'atlas-v3';
```

Keep the existing install/activate/fetch strategy otherwise unchanged so activation deletes `atlas-v1`/`atlas-v2` caches automatically.

- [ ] **Step 3: Verify Service Worker assets from the deployed origin**

After deployment, fetch `/sw.js` and verify it contains `atlas-v3`. Fetch `/precache.json` and verify both `/details.mjs` and `/country-details.json` are present.

- [ ] **Step 4: Verify the installed-PWA update path**

On an installed Android PWA:
- Open once online so the new Service Worker can install and activate.
- Close and reopen the PWA.
- Put the device/browser offline.
- Reopen Atlas and confirm the base UI loads and a sampled detail card opens with its content.

- [ ] **Step 5: Commit**

```bash
git add precache.json sw.js
git commit -m "Cache country details in atlas-v3"
```

### Task 6: Research and Populate the Full 197-Country Dataset in Verified Batches

**Files:**
- Modify: `country-details.json`
- Optionally create research notes under: `docs/research/country-details/`

**Interfaces:**
- Every ISO code present in `countries.json` must eventually have one valid entry in `country-details.json`.
- No duplicate ISO keys.
- Every completed record passes the Task 1 helper validation and has 2–4 source links.

- [ ] **Step 1: Generate the authoritative ISO checklist from `countries.json`**

Use a small script or JSON inspection to produce the exact list of country codes currently shipped by Atlas. The checklist must contain 197 records matching the app, including the project's existing Kosovo/Taiwan/Vatican/Palestine coverage.

- [ ] **Step 2: Research in batches of 15–25 countries**

For each country, verify:
- concise etymology;
- concise explanation of how the current name came into use, when known;
- one principal `modernStateYear`;
- explanatory `modernStateNote` where needed;
- 2–4 direct sources from the approved hierarchy.

Do not infer a founding year from an ancient polity. Where dates are genuinely contested or multi-stage, use the note to state the convention used without presenting ambiguity as certainty.

- [ ] **Step 3: Validate each batch structurally before commit**

Run:

```bash
node --test details.test.mjs
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('country-details.json','utf8')); for (const [code,d] of Object.entries(data)) { if (!d.etymology || !d.nameStory || !Number.isInteger(d.modernStateYear) || typeof d.modernStateNote !== 'string' || !Array.isArray(d.sources) || d.sources.length < 2 || d.sources.length > 4) throw new Error('Invalid '+code); } console.log(Object.keys(data).length+' valid detail records');"
```

Expected: tests pass and the script prints the current batch-total record count with no exception.

- [ ] **Step 4: Commit every verified batch separately**

Example:

```bash
git add country-details.json docs/research/country-details
git commit -m "Add verified country details batch 1"
```

Repeat for each batch so research mistakes can be isolated and reviewed.

- [ ] **Step 5: Verify full coverage after the final batch**

Run a coverage script comparing `countries.json` codes against `country-details.json` keys. Expected: 0 missing codes and 0 unexpected codes.

### Task 7: End-to-End Regression and Deployment Verification

**Files:**
- No new production files required unless verification reveals a defect.

**Interfaces:**
- Confirms the complete spec against production deployment and installed PWA behavior.

- [ ] **Step 1: Run automated helper tests**

Run: `node --test details.test.mjs`

Expected: all tests pass, 0 failures.

- [ ] **Step 2: Run structural JSON checks**

Parse `countries.json`, `country-details.json`, `precache.json`, and `manifest.webmanifest` with Node. Expected: all parse cleanly.

- [ ] **Step 3: Verify core existing behavior**

Confirm:
- Hebrew/English search still filters correctly.
- Continent filters still work.
- Reset still works.
- Dark theme remains active.
- Install dialog and PWA install path still work.

- [ ] **Step 4: Verify country-dialog behavior on desktop and mobile**

Confirm:
- tap/click opens the matching country;
- Enter/Space opens it from keyboard focus;
- visible close button closes it;
- backdrop click closes it;
- Escape closes it;
- focus returns to the originating card;
- long content scrolls inside the dialog rather than behind the page;
- sources open in a new tab with `noopener noreferrer`.

- [ ] **Step 5: Verify production deployment**

Confirm the latest Vercel deployment is `READY` and production, then fetch:
- `/country-details.json`
- `/details.mjs`
- `/precache.json`
- `/sw.js`

Expected: HTTP 200 for each, with `atlas-v3` in `sw.js` and detail assets present in `precache.json`.

- [ ] **Step 6: Verify installed Android PWA offline behavior**

After one online launch/update, disconnect networking and confirm:
- Atlas launches;
- search/filter base data remains available;
- country details open for completed records;
- source links remain visible but naturally cannot load until online.

- [ ] **Step 7: Final coverage check**

For the completed rollout, confirm the detail dataset has exactly one record for every code shipped in `countries.json`.

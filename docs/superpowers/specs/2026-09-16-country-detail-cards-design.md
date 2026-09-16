# Country Detail Cards Design

## Goal
Add an accessible floating detail card for every country in Atlas, backed by a separate verified data file containing concise etymology, name-history context, the founding year of the modern state, and sources.

## User Experience
- Every existing country card becomes clickable/tappable.
- Activating a country opens a dark floating modal card above the current page.
- The modal header shows the flag, Hebrew name, English name, and ISO country code.
- The content contains three concise sections:
  1. **אטימולוגיה** — a short, clear explanation of the origin and meaning of the country name.
  2. **איך התקבל השם** — a short account of how the current name came into official or common use, when known.
  3. **הקמת המדינה המודרנית** — one primary year for the modern state's establishment, plus a brief note when the historical situation is complex.
- A collapsible **מקורות** section lists 2–4 direct source links used for that country's details.
- The modal closes with the visible close button, Escape, or a click/tap on the backdrop.
- Focus must move into the modal when opened and return to the originating country card when closed.
- The modal must be usable on mobile, desktop, keyboard navigation, and screen readers.

## Data Architecture
Keep the existing `countries.json` unchanged for fast search and filtering. Add a separate `country-details.json` keyed by ISO country code.

Each country detail entry uses this shape:

```json
{
  "IL": {
    "etymology": "...",
    "nameStory": "...",
    "modernStateYear": 1948,
    "modernStateNote": "...",
    "sources": [
      {"label": "...", "url": "https://..."}
    ]
  }
}
```

Required fields:
- `etymology`: concise Hebrew text, normally 3–5 lines in the rendered card.
- `nameStory`: concise Hebrew text, normally 3–5 lines in the rendered card.
- `modernStateYear`: one primary year representing the establishment of the modern state.
- `modernStateNote`: short explanatory note when a single year could otherwise be misleading; may be an empty string when unnecessary.
- `sources`: 2–4 verified sources with labels and direct URLs.

The UI matches detail data to the base country record by ISO code. If detail data is missing or fails to load, the modal still opens with the base country information and displays a short message that extended details are currently unavailable.

## Historical Data Policy
- `modernStateYear` means the founding/establishment year of the modern state, not the date of the earliest civilization, dynasty, or settlement in the territory.
- Where there are several defensible dates (independence, unification, restoration, constitutional re-foundation, etc.), store one principal year and explain the choice briefly in `modernStateNote`.
- Avoid presenting disputed or ambiguous historical interpretations as certain facts.
- Data should be verified before being added to the production dataset.

## Sources
Preferred source hierarchy:
1. CIA World Factbook where it directly supports country-name etymology or independence/state-formation information.
2. Official government or national institutional sources.
3. Encyclopaedia Britannica or comparable reputable reference works.
4. Other reputable historical or linguistic institutional sources when needed.

Each country should normally include 2–4 sources. Source links are shown in the collapsible `מקורות` section.

## Loading and Offline Behavior
- Load `countries.json` as today.
- Load `country-details.json` once during app startup and keep it in memory.
- Add `/country-details.json` to `precache.json`.
- Bump the Service Worker cache name from `atlas-v2` to `atlas-v3` so installed PWAs receive the new data and UI assets instead of stale cached files.
- After one successful online load/update, the floating cards and detail dataset should be available offline.
- External source links themselves naturally require internet access.

## UI Integration
- Reuse the existing dark visual language.
- Existing country cards remain visually familiar but gain an obvious interactive affordance (pointer/focus state) without clutter.
- Use a dedicated `<dialog>` for the country details rather than overloading the existing install dialog.
- The detail dialog must be responsive: near-full-width on small screens, constrained readable width on larger screens, with internal scrolling when content is taller than the viewport.
- Source links must be visibly distinguishable and keyboard focusable.

## Accessibility
- Country cards must be keyboard-activatable, preferably as buttons or with equivalent button semantics.
- The detail dialog must have an accessible name tied to the selected country.
- Focus moves to the dialog on open and returns to the initiating country card on close.
- Escape closes the dialog.
- Text contrast must remain appropriate for the dark theme.
- Screen readers should receive meaningful section headings and link labels.

## Error Handling
- If `country-details.json` fails to load, the main Atlas search/filter experience must still work.
- Opening a country in that state shows the base country data plus an extended-information-unavailable message.
- A malformed or missing detail entry for one country must not break other country cards.
- Invalid source entries should be omitted rather than rendering broken links.

## Verification
Verify at least the following before release:
- A country opens the correct detail modal on mobile and desktop.
- Close button, backdrop click, and Escape all close the modal.
- Focus returns to the originating country card.
- Country code lookup always opens the matching detail record.
- Missing-detail fallback works without breaking the app.
- `country-details.json` is available offline after the Service Worker caches `atlas-v3`.
- Existing search, continent filters, install flow, dark theme, and PWA behavior continue to work.

## Delivery Strategy
Implement the UI/data mechanism first with a small verified sample so behavior can be tested end-to-end. Then populate the full country dataset in verified batches. Do not auto-fill all 197 countries from a single unreviewed source or generated guesswork.

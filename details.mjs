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
  const categories = ['independence', 'formation', 'constitution', 'nameChange'];
  if (!detail.history || typeof detail.history !== 'object') return null;
  for (const category of categories) {
    if (!Object.hasOwn(detail.history, category)) return null;
    const event = detail.history[category];
    if (event !== null && (!Number.isInteger(event?.year) ||
      typeof event.note !== 'string' || !event.note.trim() ||
      typeof event.source !== 'string' || !event.source.startsWith('https://'))) return null;
  }
  if (!Number.isInteger(detail.historicalMilestone?.year) || typeof detail.historicalMilestone?.note !== 'string') return null;
  return { ...detail, sources: validSources(detail.sources) };
}

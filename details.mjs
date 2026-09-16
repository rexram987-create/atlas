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

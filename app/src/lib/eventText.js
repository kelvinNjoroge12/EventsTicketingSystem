export const EVENT_TITLE_MAX_CHARS = 50;
export const EVENT_LOCATION_MAX_CHARS = 35;

export const truncateText = (value, maxChars) => {
  const normalized = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  if (!normalized) return '';
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
};

export const capEventTitle = (value, fallback = 'Untitled Event') =>
  truncateText(value || fallback, EVENT_TITLE_MAX_CHARS);

export const capEventLocation = (value, fallback = 'Online') =>
  truncateText(value || fallback, EVENT_LOCATION_MAX_CHARS);

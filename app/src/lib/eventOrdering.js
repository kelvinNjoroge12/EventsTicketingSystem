const getTimeBucket = (event) => {
  if (!event) return 1;
  if (event.isPast || event.timeState === 'past' || event.status === 'completed') return 2;
  if (event.timeState === 'live' || event.timeState === 'today' || event.isToday) return 0;
  return 1;
};

const toTimestamp = (value, fallback = Number.POSITIVE_INFINITY) => {
  const timestamp = new Date(value || '').getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
};

const toTimeValue = (value, fallback = Number.POSITIVE_INFINITY) => {
  if (!value || typeof value !== 'string') return fallback;
  const parts = value.split(':');
  const hours = Number.parseInt(parts[0], 10);
  const minutes = Number.parseInt(parts[1], 10);
  const seconds = Number.parseInt(parts[2], 10) || 0;

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback;
  return (hours * 3600) + (minutes * 60) + seconds;
};

export const sortPublicEvents = (events = []) => (
  [...events].sort((a, b) => {
    const priorityBucketDelta = ((Number(b?.displayPriority) || 0) > 0 ? 0 : 1) - ((Number(a?.displayPriority) || 0) > 0 ? 0 : 1);
    if (priorityBucketDelta !== 0) return priorityBucketDelta;

    const priorityDelta = (Number(b?.displayPriority) || 0) - (Number(a?.displayPriority) || 0);
    if (priorityDelta !== 0) return priorityDelta;

    const bucketDelta = getTimeBucket(a) - getTimeBucket(b);
    if (bucketDelta !== 0) return bucketDelta;

    const startDelta = toTimestamp(a?.date) - toTimestamp(b?.date);
    if (startDelta !== 0) return startDelta;

    const startTimeDelta = toTimeValue(a?.rawStartTime || a?.startTime || a?.time) - toTimeValue(b?.rawStartTime || b?.startTime || b?.time);
    if (startTimeDelta !== 0) return startTimeDelta;

    const publishedDelta = toTimestamp(b?.publishedAt, Number.NEGATIVE_INFINITY) - toTimestamp(a?.publishedAt, Number.NEGATIVE_INFINITY);
    if (publishedDelta !== 0) return publishedDelta;

    const titleA = (a?.title || a?.name || '').toLowerCase();
    const titleB = (b?.title || b?.name || '').toLowerCase();
    return titleA.localeCompare(titleB);
  })
);

export const sortPastEvents = (events = []) => (
  [...events].sort((a, b) => {
    const endDelta = toTimestamp(b?.endDate || b?.date, Number.NEGATIVE_INFINITY) - toTimestamp(a?.endDate || a?.date, Number.NEGATIVE_INFINITY);
    if (endDelta !== 0) return endDelta;

    return (b?.displayPriority || 0) - (a?.displayPriority || 0);
  })
);

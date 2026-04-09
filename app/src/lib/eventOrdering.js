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

export const sortPublicEvents = (events = []) => (
  [...events].sort((a, b) => {
    const priorityDelta = (Number(b?.displayPriority) || 0) - (Number(a?.displayPriority) || 0);
    if (priorityDelta !== 0) return priorityDelta;

    const bucketDelta = getTimeBucket(a) - getTimeBucket(b);
    if (bucketDelta !== 0) return bucketDelta;

    const startDelta = toTimestamp(a?.date) - toTimestamp(b?.date);
    if (startDelta !== 0) return startDelta;

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

const normalizeParams = (params = {}) => {
  const normalized = {};
  Object.keys(params)
    .sort()
    .forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        normalized[key] = value;
      }
    });
  return normalized;
};

export const eventQueryKeys = {
  all: () => ['events'],
  lists: () => ['events', 'list'],
  list: (params = {}) => ['events', 'list', normalizeParams(params)],
  listInfinite: (params = {}) => ['events', 'list-infinite', normalizeParams(params)],
  detail: (slug) => ['events', 'detail', slug],
  detailLite: (slug) => ['events', 'detail-lite', slug],
  related: (slug) => ['events', 'related', slug],
  speakers: (slug) => ['events', 'speakers', slug],
  schedule: (slug) => ['events', 'schedule', slug],
  sponsors: (slug) => ['events', 'sponsors', slug],
  categories: () => ['events', 'categories'],
};

export default eventQueryKeys;

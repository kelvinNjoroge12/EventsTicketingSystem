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
  detail: (slug) => ['events', 'detail', slug],
  related: (slug) => ['events', 'related', slug],
  categories: () => ['events', 'categories'],
};

export default eventQueryKeys;

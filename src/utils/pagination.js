export function getPagination(query = {}, defaults = {}) {
  const page = Math.max(Number(query.page || defaults.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || defaults.limit || 20), 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

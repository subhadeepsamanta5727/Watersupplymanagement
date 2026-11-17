const parsePagination = (query) => {
  if (query.page === undefined && query.limit === undefined) return null;

  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    const error = new Error('page must be a positive integer and limit must be between 1 and 100');
    error.statusCode = 400;
    throw error;
  }

  return { page, limit };
};

module.exports = { parsePagination };

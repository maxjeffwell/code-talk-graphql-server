/**
 * PaginationService - Reusable cursor-based pagination logic
 *
 * Provides consistent pagination across all list queries using
 * cursor-based pagination (Relay-style connections).
 */

import { Sequelize } from 'sequelize';

/**
 * Encode a value to a cursor hash (base64)
 * @param {string} value - Value to encode
 * @returns {string} Base64 encoded cursor
 */
export const toCursorHash = (value) => {
  return Buffer.from(String(value)).toString('base64');
};

/**
 * Decode a cursor hash back to original value
 * @param {string} hash - Base64 encoded cursor
 * @returns {string} Decoded value
 */
export const fromCursorHash = (hash) => {
  return Buffer.from(hash, 'base64').toString('ascii');
};

/**
 * Build cursor-based where clause for Sequelize queries
 * @param {string|null} cursor - Optional cursor for pagination
 * @param {string} field - Field to paginate on (default: 'createdAt')
 * @returns {Object} Sequelize where clause options
 */
export const buildCursorQuery = (cursor, field = 'createdAt') => {
  if (!cursor) {
    return {};
  }

  return {
    where: {
      [field]: {
        [Sequelize.Op.lt]: fromCursorHash(cursor),
      },
    },
  };
};

/**
 * Format query results into a paginated connection response
 * @param {Array} items - Query results (fetched with limit + 1)
 * @param {number} limit - Requested page size
 * @param {string} cursorField - Field to use for cursor (default: 'createdAt')
 * @returns {Object} Connection with edges and pageInfo
 */
export const formatPaginatedResponse = (items, limit, cursorField = 'createdAt') => {
  const hasNextPage = items.length > limit;
  const edges = hasNextPage ? items.slice(0, -1) : items;

  return {
    edges,
    pageInfo: {
      hasNextPage,
      endCursor: edges.length > 0
        ? toCursorHash(String(edges[edges.length - 1][cursorField]))
        : null,
    },
  };
};

/**
 * Execute a paginated query with standard options
 * @param {Object} model - Sequelize model
 * @param {Object} options - Query options
 * @param {string|null} options.cursor - Pagination cursor
 * @param {number} options.limit - Page size (default: 10)
 * @param {Object} options.where - Additional where conditions
 * @param {Array} options.order - Order clause (default: [['createdAt', 'DESC']])
 * @param {Array} options.include - Include associations
 * @returns {Promise<Object>} Paginated response with edges and pageInfo
 */
export const paginatedQuery = async (model, options = {}) => {
  const {
    cursor = null,
    limit = 10,
    where = {},
    order = [['createdAt', 'DESC']],
    include = [],
  } = options;

  const cursorOptions = buildCursorQuery(cursor);

  const items = await model.findAll({
    order,
    limit: limit + 1,
    where: {
      ...where,
      ...cursorOptions.where,
    },
    include,
  });

  return formatPaginatedResponse(items, limit);
};

export default {
  toCursorHash,
  fromCursorHash,
  buildCursorQuery,
  formatPaginatedResponse,
  paginatedQuery,
};

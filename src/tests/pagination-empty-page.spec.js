/**
 * Regression: a room with no messages must return an empty connection, not a
 * GraphQL error. Before 2026-10-22 PageInfo.endCursor was declared `String!`
 * while formatPaginatedResponse() returns null for an empty page, so the
 * whole `messages` query failed ("Cannot return null for non-nullable field
 * PageInfo.endCursor"). The client then showed its "No messages" placeholder
 * without mounting the message list or its subscriptions, and a freshly sent
 * message only appeared after a page refresh.
 *
 * Self-contained: builds the schema from src/schema with a stub resolver, no
 * server or database needed (unlike message.spec.js).
 */
import { expect } from 'chai';
import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';

import typeDefs from '../schema';
import { formatPaginatedResponse } from '../services/PaginationService';

// Same selection set the React client sends (GET_PAGINATED_MESSAGES_QUERY).
const MESSAGES_QUERY = `
  query($cursor: String, $limit: Int!, $roomId: ID) {
    messages(cursor: $cursor, limit: $limit, roomId: $roomId) {
      edges { id text createdAt roomId user { id username } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

describe('messages connection for an empty room', () => {
  it('formatPaginatedResponse yields no cursor for an empty page', () => {
    const page = formatPaginatedResponse([], 10);
    expect(page.edges).to.deep.equal([]);
    expect(page.pageInfo.hasNextPage).to.equal(false);
    expect(page.pageInfo.endCursor).to.equal(null);
  });

  it('the schema accepts that empty page without errors', async () => {
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: { messages: () => formatPaginatedResponse([], 10) },
      },
    });

    const result = await graphql({
      schema,
      source: MESSAGES_QUERY,
      variableValues: { limit: 10, roomId: '42' },
    });

    expect(result.errors, JSON.stringify(result.errors)).to.equal(undefined);
    expect(result.data.messages.edges).to.deep.equal([]);
    expect(result.data.messages.pageInfo).to.deep.equal({
      hasNextPage: false,
      endCursor: null,
    });
  });
});

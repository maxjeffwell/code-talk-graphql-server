import { expect } from 'chai';
import { sequelize } from '../models';
import models from '../models';

// Test configuration
export const testConfig = {
  testTimeout: 10000,
  testUser: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123!',
  },
  testAdmin: {
    username: 'testadmin',
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    role: 'ADMIN',
  },
};

// Database setup and teardown
export const setupDatabase = async () => {
  try {
    // Force sync database (drop and recreate tables)
    await sequelize.sync({ force: true });
    
    // Create test users
    const user = await models.User.create(testConfig.testUser);
    const admin = await models.User.create(testConfig.testAdmin);
    
    return { user, admin };
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
};

export const teardownDatabase = async () => {
  try {
    // Clean up all data
    await sequelize.drop();
    await sequelize.close();
  } catch (error) {
    console.error('Database teardown failed:', error);
    throw error;
  }
};

// Helper to create authenticated context
export const createTestContext = (user = null) => {
  return {
    models,
    me: user,
    loaders: {
      user: {
        load: async (id) => models.User.findByPk(id),
        loadMany: async (ids) => models.User.findAll({ where: { id: ids } }),
      },
      message: {
        load: async (id) => models.Message.findByPk(id),
        loadMany: async (ids) => models.Message.findAll({ where: { id: ids } }),
      },
    },
  };
};

// Helper to generate JWT token for testing
export const generateTestToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Custom assertions
export const customAssertions = {
  assertGraphQLError: (result, expectedMessage) => {
    expect(result).to.have.property('errors');
    expect(result.errors).to.be.an('array');
    expect(result.errors[0]).to.have.property('message');
    if (expectedMessage) {
      expect(result.errors[0].message).to.include(expectedMessage);
    }
  },
  
  assertGraphQLSuccess: (result) => {
    expect(result).to.not.have.property('errors');
    expect(result).to.have.property('data');
  },
  
  assertAuthenticationError: (result) => {
    customAssertions.assertGraphQLError(result);
    expect(result.errors[0].extensions.code).to.equal('UNAUTHENTICATED');
  },
  
  assertValidationError: (result) => {
    customAssertions.assertGraphQLError(result);
    expect(result.errors[0].extensions.code).to.equal('BAD_USER_INPUT');
  },
};

// Mock data generators
export const mockData = {
  randomUsername: () => `user_${Math.random().toString(36).substr(2, 9)}`,
  randomEmail: () => `${Math.random().toString(36).substr(2, 9)}@test.com`,
  randomMessage: () => `Test message ${Date.now()}`,
  
  createMockUser: (overrides = {}) => ({
    username: mockData.randomUsername(),
    email: mockData.randomEmail(),
    password: 'MockPassword123!',
    ...overrides,
  }),
  
  createMockMessage: (userId, overrides = {}) => ({
    text: mockData.randomMessage(),
    userId,
    ...overrides,
  }),
};

// GraphQL query/mutation helpers
export const graphqlQueries = {
  // User queries
  ME: `
    query Me {
      me {
        id
        username
        email
        role
      }
    }
  `,
  
  USERS: `
    query Users {
      users {
        id
        username
        email
        role
      }
    }
  `,
  
  USER: `
    query User($id: ID!) {
      user(id: $id) {
        id
        username
        email
        role
        messages {
          id
          text
          createdAt
        }
      }
    }
  `,
  
  // Message queries
  MESSAGES: `
    query Messages($cursor: String, $limit: Int) {
      messages(cursor: $cursor, limit: $limit) {
        edges {
          id
          text
          createdAt
          user {
            id
            username
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
};

export const graphqlMutations = {
  // Authentication mutations
  SIGN_UP: `
    mutation SignUp($username: String!, $email: String!, $password: String!) {
      signUp(username: $username, email: $email, password: $password) {
        token
        refreshToken
      }
    }
  `,
  
  SIGN_IN: `
    mutation SignIn($login: String!, $password: String!) {
      signIn(login: $login, password: $password) {
        token
        refreshToken
      }
    }
  `,
  
  // Message mutations
  CREATE_MESSAGE: `
    mutation CreateMessage($text: String!) {
      createMessage(text: $text) {
        id
        text
        createdAt
        user {
          id
          username
        }
      }
    }
  `,
  
  DELETE_MESSAGE: `
    mutation DeleteMessage($id: ID!) {
      deleteMessage(id: $id)
    }
  `,
};

// Export everything
export default {
  testConfig,
  setupDatabase,
  teardownDatabase,
  createTestContext,
  generateTestToken,
  customAssertions,
  mockData,
  graphqlQueries,
  graphqlMutations,
};
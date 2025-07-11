import { getComplexity, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';
import logger from './logger.js';

// Default complexity configuration
const DEFAULT_MAX_COMPLEXITY = 1000;
const DEFAULT_SCALAR_COST = 1;
const DEFAULT_OBJECT_COST = 2;
const DEFAULT_LIST_FACTOR = 10;
const DEFAULT_DEPTH_FACTOR = 1.5;

// Create complexity estimator
export const createComplexityEstimator = (options = {}) => {
  const {
    scalarCost = DEFAULT_SCALAR_COST,
    objectCost = DEFAULT_OBJECT_COST,
    listFactor = DEFAULT_LIST_FACTOR,
    depthFactor = DEFAULT_DEPTH_FACTOR,
  } = options;

  return simpleEstimator({
    defaultComplexity: scalarCost,
    scalarCost,
    objectCost,
    listFactor,
    depthCost: (depth) => Math.pow(depthFactor, depth),
  });
};

// Custom complexity rules for specific fields
export const complexityRules = {
  // High complexity for pagination queries
  Query: {
    messages: ({ args }) => {
      const limit = args.limit || 50;
      return limit * 2; // Each message costs 2 complexity points
    },
    users: ({ args }) => {
      const limit = args.limit || 100;
      return limit * 1.5; // Each user costs 1.5 complexity points
    },
  },
  
  // Nested field complexities
  Message: {
    user: () => 2, // Fetching user for a message
  },
  
  User: {
    messages: ({ args }) => {
      const limit = args.limit || 50;
      return limit * 2; // Fetching messages for a user
    },
  },
  
  // Subscription complexities
  Subscription: {
    messageCreated: () => 5, // Base cost for subscription
    editorChanged: () => 3, // Lower cost for editor events
  },
};

// Create complexity plugin for Apollo Server
export const createComplexityPlugin = (maxComplexity = DEFAULT_MAX_COMPLEXITY) => {
  return {
    requestDidStart() {
      return {
        didResolveOperation({ request, document, operationName }) {
          try {
            // Calculate query complexity
            const complexity = getComplexity({
              schema: request.schema,
              query: document,
              variables: request.variables,
              estimators: [
                fieldExtensionsEstimator(),
                createComplexityEstimator(),
              ],
            });

            // Log the complexity
            logger.info('Query complexity calculated', {
              operationName,
              complexity,
              maxComplexity,
              variables: request.variables,
            });

            // Check if complexity exceeds the limit
            if (complexity > maxComplexity) {
              logger.warn('Query complexity exceeded', {
                operationName,
                complexity,
                maxComplexity,
                query: request.query,
              });
              
              throw new Error(
                `Query complexity ${complexity} exceeds maximum allowed complexity of ${maxComplexity}`
              );
            }
          } catch (error) {
            // If it's already a complexity error, re-throw it
            if (error.message.includes('Query complexity')) {
              throw error;
            }
            
            // Log other errors but don't block the request
            logger.error('Error calculating query complexity', {
              error: error.message,
              operationName,
            });
          }
        },
      };
    },
  };
};

// Complexity analysis utilities
export const analyzeQueryComplexity = (schema, query, variables = {}) => {
  try {
    const complexity = getComplexity({
      schema,
      query,
      variables,
      estimators: [
        fieldExtensionsEstimator(),
        createComplexityEstimator(),
      ],
    });
    
    return {
      complexity,
      isValid: complexity <= DEFAULT_MAX_COMPLEXITY,
      maxAllowed: DEFAULT_MAX_COMPLEXITY,
    };
  } catch (error) {
    logger.error('Failed to analyze query complexity', {
      error: error.message,
    });
    
    return {
      complexity: 0,
      isValid: false,
      error: error.message,
    };
  }
};

// Middleware to add complexity to field resolvers
export const addComplexityToSchema = (schema) => {
  // This would be implemented to add complexity annotations to schema
  // For now, we rely on the estimators and custom rules
  return schema;
};

// Helper to estimate complexity for common patterns
export const complexityHelpers = {
  // Estimate complexity for pagination
  paginationComplexity: (limit = 50, defaultCost = 2) => {
    return Math.min(limit, 100) * defaultCost;
  },
  
  // Estimate complexity for nested queries
  nestedComplexity: (depth, baseCost = 1) => {
    return baseCost * Math.pow(1.5, depth);
  },
  
  // Estimate complexity for search queries
  searchComplexity: (searchFields = 1, limit = 50) => {
    return searchFields * limit * 3; // Search is more expensive
  },
};

// Rate limiting based on complexity
export const createComplexityRateLimiter = (options = {}) => {
  const {
    windowMs = 60000, // 1 minute
    maxComplexity = 10000, // Total complexity allowed per window
  } = options;
  
  const complexityMap = new Map();
  
  return (req, complexity) => {
    const key = req.ip;
    const now = Date.now();
    
    if (!complexityMap.has(key)) {
      complexityMap.set(key, []);
    }
    
    const userComplexity = complexityMap.get(key);
    
    // Remove old entries
    const validComplexity = userComplexity.filter(
      entry => now - entry.timestamp < windowMs
    );
    
    // Calculate total complexity in window
    const totalComplexity = validComplexity.reduce(
      (sum, entry) => sum + entry.complexity,
      0
    );
    
    if (totalComplexity + complexity > maxComplexity) {
      logger.warn('Complexity rate limit exceeded', {
        ip: key,
        totalComplexity,
        newComplexity: complexity,
        maxComplexity,
      });
      
      return false; // Rate limit exceeded
    }
    
    // Add new complexity
    validComplexity.push({ timestamp: now, complexity });
    complexityMap.set(key, validComplexity);
    
    return true; // Request allowed
  };
};

export default {
  createComplexityEstimator,
  createComplexityPlugin,
  analyzeQueryComplexity,
  addComplexityToSchema,
  complexityHelpers,
  createComplexityRateLimiter,
  complexityRules,
};
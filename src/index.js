// Load configuration first (handles dotenv and validation)
import { server as serverConfig, security, graphql as graphqlConfig } from './config/index.js';

import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { bodyParserGraphQL } from 'body-parser-graphql';
import morgan from 'morgan';
import http from 'http';
import DataLoader from 'dataloader';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import client from 'prom-client';
import {
  ApolloServer,
  AuthenticationError,
} from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer } from 'ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import depthLimit from 'graphql-depth-limit';
import {
  getComplexity,
  simpleEstimator,
  fieldExtensionsEstimator,
} from 'graphql-query-complexity';

import schema from './schema';
import resolvers from './resolvers';
import models, { sequelize } from './models';

// Log AI routes registration
console.log('AI routes registered successfully');
import loaders from './loaders';
import logger from './utils/logger.js';
import { formatError, errorHandler } from './utils/errors.js';
import { getUserFromRequest, verifyToken } from './utils/auth.js';
import { serverTimingMiddleware, createTiming } from './utils/timing.js';
import { csrfCookieMiddleware, validateCsrfToken, CSRF_HEADER_NAME } from './utils/csrf.js';
import pubsub from './subscription';

// Prometheus metrics setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5],
  registers: [register]
});

const app = express();

// Metrics middleware (before other middleware)
app.use((req, res, next) => {
  if (req.path === '/metrics' || req.path === '/health') return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path || req.path || 'unknown';
    const labels = { method: req.method, route, status: res.statusCode.toString() };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });
  next();
});

// Trust proxy headers when behind reverse proxy (Kubernetes Ingress/Traefik)
// Use 1 to trust only the first proxy hop (more secure than 'true')
app.set('trust proxy', 1);

// Response compression - reduces bandwidth and improves response times
// Only compress responses > 1KB, skip if client requests no compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Compression level (1-9), 6 is a good balance of speed vs size
}));

// Server-Timing middleware - tracks request timing for performance monitoring
app.use(serverTimingMiddleware());

// Enhanced CORS configuration with security best practices - MUST BE FIRST
app.use(
  cors({
    origin: security.corsOrigins,
    credentials: true, // Allow cookies and authentication headers
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Token', // Custom token header
      'x-token', // Lowercase variant
      'X-Apollo-Tracing', // Apollo GraphQL tracing
      'X-CSRF-Token', // CSRF protection header
      'x-csrf-token' // Lowercase variant
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Server-Timing'
    ],
    maxAge: 86400, // 24 hours preflight cache
    optionsSuccessStatus: 200, // For legacy browser support
    preflightContinue: false // Handle preflight internally
  }),
);

app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for now to avoid conflicts
    crossOriginEmbedderPolicy: false,
  }),
);

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(bodyParserGraphQL());

// Cookie parser for httpOnly cookie authentication
app.use(cookieParser());

// CSRF protection - set token cookie on GET requests
app.use(csrfCookieMiddleware);

// Enhanced logging with Winston
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Add error handling middleware
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const getMe = async req => {
  try {
    return await getUserFromRequest(req);
  } catch (error) {
    // Don't throw error here, let resolvers handle authentication
    return null;
  }
};

// Create executable schema
const executableSchema = makeExecutableSchema({
  typeDefs: schema,
  resolvers,
});

// SECURITY: Disable schema introspection and playground in production
// These expose the entire API structure to potential attackers
const isProduction = serverConfig.isProduction;

// Query complexity configuration
// Prevents DoS attacks via expensive nested queries
const MAX_QUERY_COMPLEXITY = 1000;
const COMPLEXITY_CONFIG = {
  scalarCost: 1,      // Each scalar field costs 1
  objectCost: 2,      // Each object field costs 2
  listFactor: 10,     // Lists multiply the child cost by 10
};

// CSRF validation plugin for GraphQL mutations
// Auth mutations (signIn, signUp) are exempt - user doesn't have CSRF token yet
const CSRF_EXEMPT_MUTATIONS = ['signIn', 'signUp'];

const csrfValidationPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation({ operation, context, document }) {
        // Only validate mutations (not queries or subscriptions)
        if (operation?.operation === 'mutation') {
          // Skip for WebSocket connections (no cookies auto-sent)
          if (!context.req) return;

          // Check if this is an exempt mutation (auth mutations)
          const selections = operation.selectionSet?.selections || [];
          const mutationNames = selections.map(s => s.name?.value).filter(Boolean);
          const isExempt = mutationNames.some(name => CSRF_EXEMPT_MUTATIONS.includes(name));

          if (isExempt) {
            logger.debug('CSRF validation skipped for auth mutation', { mutations: mutationNames });
            return;
          }

          const result = validateCsrfToken(context.req);
          if (!result.valid) {
            throw new AuthenticationError(result.error);
          }
          logger.debug('CSRF token validated for mutation');
        }
      },
    };
  },
};

const server = new ApolloServer({
  introspection: !isProduction,
  playground: !isProduction,
  debug: !isProduction,
  schema: executableSchema,
  formatError,
  validationRules: [
    depthLimit(10) // Limit query depth to 10 levels
  ],
  plugins: [
    // CSRF validation for mutations
    csrfValidationPlugin,
    // Query complexity limiting plugin
    {
      requestDidStart: () => ({
        didResolveOperation({ request, document }) {
          // Calculate query complexity
          const complexity = getComplexity({
            schema: executableSchema,
            operationName: request.operationName,
            query: document,
            variables: request.variables,
            estimators: [
              // Use field extensions if defined in schema
              fieldExtensionsEstimator(),
              // Fallback to simple estimator with configured costs
              simpleEstimator({
                defaultComplexity: COMPLEXITY_CONFIG.scalarCost,
              }),
            ],
          });

          // Log complexity for monitoring
          logger.debug('Query complexity calculated', {
            operationName: request.operationName,
            complexity,
            maxAllowed: MAX_QUERY_COMPLEXITY,
          });

          // Reject overly complex queries
          if (complexity > MAX_QUERY_COMPLEXITY) {
            logger.warn('Query complexity exceeded', {
              operationName: request.operationName,
              complexity,
              maxAllowed: MAX_QUERY_COMPLEXITY,
            });
            throw new Error(
              `Query too complex: ${complexity}. Maximum allowed complexity: ${MAX_QUERY_COMPLEXITY}`
            );
          }
        },
      }),
    },
    // Logging plugin
    {
      requestDidStart() {
        return {
          didResolveOperation({ request, document }) {
            const operationName = request.operationName;
            const query = request.query;
            logger.info('GraphQL Operation Started', {
              operationName,
              query: query?.replace(/\s+/g, ' ').trim()
            });
          },
          didEncounterErrors({ errors }) {
            errors.forEach(error => {
              logger.error('GraphQL Error Encountered', {
                message: error.message,
                path: error.path,
                locations: error.locations
              });
            });
          },
          willSendResponse({ response }) {
            if (response.errors) {
              logger.warn('GraphQL Response with errors', {
                errorCount: response.errors.length
              });
            }
          }
        };
      }
    }
  ],
  context: async ({ req, res, connection }) => {
    // Get timing from request (created by serverTimingMiddleware)
    const timing = req?.timing || createTiming();

    if (connection) {
      return {
        models,
        pubsub,
        timing,
        loaders: {
          message: new DataLoader(keys => loaders.message.batchMessages(keys, models)),
          messagesByUser: new DataLoader(keys => loaders.message.batchMessagesByUser(keys, models)),
          room: new DataLoader(keys => loaders.room.batchRooms(keys, models)),
          user: new DataLoader(keys => loaders.user.batchUsers(keys, models)),
          usersByEmail: new DataLoader(keys => loaders.user.batchUsersByEmail(keys, models)),
        },
      };
    }

    if (req) {
      // Time the authentication check
      const me = await timing.time('auth', 'JWT verification', () => getMe(req));

      return {
        models,
        me,
        req, // Pass request object for CSRF validation
        res, // Pass response object for setting httpOnly cookies
        pubsub,
        timing,
        loaders: {
          message: new DataLoader(keys => loaders.message.batchMessages(keys, models)),
          messagesByUser: new DataLoader(keys => loaders.message.batchMessagesByUser(keys, models)),
          room: new DataLoader(keys => loaders.room.batchRooms(keys, models)),
          user: new DataLoader(keys => loaders.user.batchUsers(keys, models)),
          usersByEmail: new DataLoader(keys => loaders.user.batchUsersByEmail(keys, models)),
        },
      };
    }
  },
});

const startServer = async () => {
  await server.start();
  server.applyMiddleware({
    app,
    path: '/graphql',
    cors: false // Use our custom CORS middleware instead
  });

  const httpServer = http.createServer(app);
  const port = serverConfig.port;

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Helper to parse cookies from cookie header string
  const parseCookies = (cookieHeader) => {
    const cookies = {};
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const key = parts[0]?.trim();
        const value = parts.slice(1).join('=')?.trim();
        if (key) cookies[key] = value;
      });
    }
    return cookies;
  };

  // Use graphql-ws for handling subscriptions
  const serverCleanup = useServer(
    {
      schema: executableSchema,
      execute,
      subscribe,
      context: async (ctx, msg, args) => {
        logger.info('WebSocket connection established');

        let me = null;
        let token = null;

        // First, try to get token from httpOnly cookie via HTTP upgrade request
        // The socket's HTTP request contains cookies sent during WebSocket handshake
        const req = ctx.extra?.request;
        if (req) {
          const cookieHeader = req.headers?.cookie;
          const cookies = parseCookies(cookieHeader);
          token = cookies.token;

          if (token) {
            logger.info('WebSocket: Found token in httpOnly cookie');
          }
        }

        // Fallback: try connection params (for backwards compatibility)
        if (!token) {
          const connectionParams = ctx.connectionParams || {};
          token = connectionParams['x-token'] || connectionParams['authorization']?.replace('Bearer ', '');

          if (token) {
            logger.info('WebSocket: Found token in connection params');
          }
        }

        // Verify the token
        if (token) {
          try {
            me = verifyToken(token);
            logger.info('WebSocket user authenticated', {
              userId: me.id,
              username: me.username
            });
          } catch (error) {
            logger.warn('WebSocket authentication failed', {
              error: error.message,
              token: token.substring(0, 10) + '...'
            });
          }
        } else {
          logger.info('WebSocket: No authentication token found');
        }

        return {
          me,
          models,
          pubsub,
          loaders: {
            message: new DataLoader(keys => loaders.message.batchMessages(keys, models)),
            messagesByUser: new DataLoader(keys => loaders.message.batchMessagesByUser(keys, models)),
            user: new DataLoader(keys => loaders.user.batchUsers(keys, models)),
            usersByEmail: new DataLoader(keys => loaders.user.batchUsersByEmail(keys, models)),
          },
        };
      },
      onConnect: async (ctx) => {
        logger.info('Client connected');
      },
      onDisconnect: async (ctx, code, reason) => {
        logger.info('Client disconnected', { code, reason });
      },
    },
    wsServer
  );

  // Database initialization
  // In production: migrations should be run separately via `npm run db:migrate`
  // In development/test: use sync() for convenience
  if (isProduction) {
    // In production, just verify the connection - migrations are run separately
    try {
      await sequelize.authenticate();
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Unable to connect to the database:', error);
      throw error;
    }
  } else {
    // In development/test, sync the schema (but don't force drop tables)
    await sequelize.sync({});
    logger.info('Database synced (development mode)');
  }

  httpServer.listen({ port }, () => {
    logger.info(`Apollo Server is running on http://localhost:${port}/graphql`);
    logger.info(`WebSocket subscriptions ready at ws://localhost:${port}/graphql`);
  });

  // =========================================================================
  // GRACEFUL SHUTDOWN HANDLING
  // Ensures WebSocket connections have time to close properly during pod
  // termination in Kubernetes. This is essential for sticky session support.
  // =========================================================================
  const SHUTDOWN_TIMEOUT = 30000; // 30 seconds to allow connections to close
  let isShuttingDown = false;

  const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
      logger.warn(`Received ${signal} during shutdown, ignoring`);
      return;
    }
    isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed, no longer accepting new connections');
    });

    // Close WebSocket server (will close all WebSocket connections)
    try {
      await new Promise((resolve, reject) => {
        const closeTimeout = setTimeout(() => {
          logger.warn('WebSocket server close timed out, forcing shutdown');
          resolve();
        }, SHUTDOWN_TIMEOUT);

        wsServer.close(() => {
          clearTimeout(closeTimeout);
          logger.info('WebSocket server closed');
          resolve();
        });
      });

      // Clean up GraphQL WS server
      await serverCleanup.dispose();
      logger.info('GraphQL WebSocket server cleaned up');
    } catch (error) {
      logger.error('Error during WebSocket cleanup', { error: error.message });
    }

    // Close Apollo Server
    try {
      await server.stop();
      logger.info('Apollo Server stopped');
    } catch (error) {
      logger.error('Error stopping Apollo Server', { error: error.message });
    }

    // Close database connection
    try {
      await sequelize.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection', { error: error.message });
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  };

  // Handle termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught errors during shutdown
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    if (!isShuttingDown) {
      gracefulShutdown('uncaughtException');
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason: reason?.toString() });
  });
};

startServer().catch((error) => {
  logger.error('Error starting server', { error: error.message, stack: error.stack });
  process.exit(1);
});

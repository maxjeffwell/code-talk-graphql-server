import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { bodyParserGraphQL } from 'body-parser-graphql';
import morgan from 'morgan';
import http from 'http';
import jwt from 'jsonwebtoken';
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
// This allows Express to correctly read X-Forwarded-For and other proxy headers
app.set('trust proxy', true);

// Server-Timing middleware - tracks request timing for performance monitoring
app.use(serverTimingMiddleware());

// Enhanced CORS configuration with security best practices - MUST BE FIRST
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'],
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
      'X-Apollo-Tracing' // Apollo GraphQL tracing
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

const server = new ApolloServer({
  introspection: true,
  playground: true,
  debug: process.env.NODE_ENV === 'development',
  schema: executableSchema,
  formatError,
  validationRules: [
    depthLimit(10) // Limit query depth to 10 levels
  ],
  plugins: [
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
  context: async ({ req, connection }) => {
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
  const port = process.env.PORT || 8000;

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Use graphql-ws for handling subscriptions
  const serverCleanup = useServer(
    {
      schema: executableSchema,
      execute,
      subscribe,
      context: async (ctx, msg, args) => {
        logger.info('WebSocket connection established');

        // Extract authentication from connection params
        let me = null;
        const connectionParams = ctx.connectionParams || {};
        const token = connectionParams['x-token'] || connectionParams['authorization']?.replace('Bearer ', '');

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

  await sequelize.sync({});
  httpServer.listen({ port }, () => {
    console.log(
      `Apollo Server is running on http://localhost:${port}/graphql`,
    );
    console.log(
      `WebSocket subscriptions ready at ws://localhost:${port}/graphql`,
    );
  });
};

startServer().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

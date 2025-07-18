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
import loaders from './loaders';
import logger from './utils/logger.js';
import { formatError, errorHandler } from './utils/errors.js';
import { getUserFromRequest } from './utils/auth.js';
import pubsub from './subscription';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: [`'self'`, 'data:', 'apollo-server-landing-page.cdn.apollographql.com'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
        manifestSrc: [`'self'`, 'apollo-server-landing-page.cdn.apollographql.com'],
        frameSrc: [`'self'`, 'sandbox.embed.apollographql.com'],
      },
    },
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

// Enhanced CORS configuration with security best practices
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false
      : true, // Allow all origins in development only
    credentials: true, // Allow cookies and authentication headers
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Token', // Custom token header
      'X-Apollo-Tracing' // Apollo GraphQL tracing
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    maxAge: 86400, // 24 hours preflight cache
    optionsSuccessStatus: 200, // For legacy browser support
    preflightContinue: false // Handle preflight internally
  }),
);

app.use(bodyParserGraphQL());

// Enhanced logging with Winston
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Add error handling middleware
app.use(errorHandler);

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
  introspection: process.env.ENABLE_INTROSPECTION === 'true' || process.env.NODE_ENV === 'development',
  playground: process.env.ENABLE_PLAYGROUND === 'true' || process.env.NODE_ENV === 'development',
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
    if (connection) {
      return {
        models,
        pubsub,
        loaders: {
          message: new DataLoader(keys => loaders.message.batchMessages(keys, models)),
          messagesByUser: new DataLoader(keys => loaders.message.batchMessagesByUser(keys, models)),
          user: new DataLoader(keys => loaders.user.batchUsers(keys, models)),
          usersByEmail: new DataLoader(keys => loaders.user.batchUsersByEmail(keys, models)),
        },
      };
    }

    if (req) {
      const me = await getMe(req);

      return {
        models,
        me,
        pubsub,
        loaders: {
          message: new DataLoader(keys => loaders.message.batchMessages(keys, models)),
          messagesByUser: new DataLoader(keys => loaders.message.batchMessagesByUser(keys, models)),
          // room: new DataLoader(keys => loaders.room.batchRooms(keys, models)),
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

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'));

    const path = require('path');
    app.get('*', (req, res) => {
      res.sendFile(
        path.resolve(__dirname, 'client', 'build', 'index.html'),
      );
    });
  }

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
        return {
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

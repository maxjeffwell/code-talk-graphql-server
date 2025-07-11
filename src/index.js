import 'dotenv/config';
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
import depthLimit from 'graphql-depth-limit';

import schema from './schema';
import resolvers from './resolvers';
import models, { sequelize } from './models';
import loaders from './loaders';
import logger from './utils/logger.js';
import { formatError, errorHandler } from './utils/errors.js';
import { getUserFromRequest } from './utils/auth.js';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
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

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    optionsSuccessStatus: 200,
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

const server = new ApolloServer({
  introspection: process.env.NODE_ENV === 'development',
  playground: false, // Disabled for security
  debug: process.env.NODE_ENV === 'development',
  typeDefs: schema,
  resolvers,
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
  server.applyMiddleware({ app, path: '/graphql' });

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

  await sequelize.sync({});
  httpServer.listen({ port }, () => {
    console.log(
      `Apollo Server is running on http://localhost:${port}/graphql`,
    );
  });
};

startServer().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

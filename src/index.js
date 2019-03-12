import 'dotenv/config';
import cors from 'cors';
import { bodyParserGraphQL } from 'body-parser-graphql';
import morgan from 'morgan';
import http from 'http';
import jwt from 'jsonwebtoken';
import DataLoader from 'dataloader';
import express from 'express';
import {
  ApolloServer,
  AuthenticationError,
} from 'apollo-server-express';

import schema from './schema';
import resolvers from './resolvers';
import models, { sequelize } from './models';
import loaders from './loaders';

const app = express();

app.use(cors());
app.use(bodyParserGraphQL());

app.use(morgan('dev'));

const getMe = async (req) => {
  const token = req.headers['x-token'];

  if (token) {
    try {
      return await jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      throw new AuthenticationError('Your session has expired. Please sign in again.');
    }
  }
};

const server = new ApolloServer({
  introspection: true,
  playground: true,
  debug: true,
  tracing: true,
  typeDefs: schema,
  resolvers,
  formatError: (error) => {
    const message = error.message
      .replace('SequelizeValidationError:', '')
      .replace('Validation error:', '')
      .replace('Validation error:', '')
      .replace('Validation error:', '');

    return {
      ...error,
      message,
    };
  },
  context: async ({ req, connection }) => {
    if (connection) {
      return {
        models,
        loaders: {
          message: new DataLoader(keys => loaders.message.batchMessages(keys, models)),
          room: new DataLoader(keys => loaders.room.batchRooms(keys, models)),
          user: new DataLoader(keys => loaders.user.batchUsers(keys, models)),
        },
      };
    }

    if (req) {
      const me = await getMe(req);

      return {
        models,
        me,
        secret: process.env.JWT_SECRET,
        loaders: {
          message: new DataLoader(keys => loaders.message.batchMessages(keys, models)),
          room: new DataLoader(keys => loaders.room.batchRooms(keys, models)),
          user: new DataLoader(keys => loaders.user.batchUsers(keys, models)),
        },
      };
    }
  },
});

server.applyMiddleware({ app, path: '/graphql' });

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));

  const path = require('path');
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

const port = process.env.PORT || 8000;

sequelize.sync({ force: true

}).then(async () => {
  httpServer.listen({ port }, () => {
    console.log(`Apollo Server is running on http://localhost:${port}/graphql`);
  });
});

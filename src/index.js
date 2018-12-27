import 'dotenv/config';
import morgan from 'morgan';
import http from 'http';
import DataLoader from 'dataloader';
import express from 'express';
import { ApolloServer, AuthenticationError } from 'apollo-server-express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

import schema from './schema';
import resolvers from './resolvers';
import models, { sequelize } from './models';
import loaders from './loaders';

const app = express();

app.use(cors());

app.use(morgan('dev'));

const getMe = async req => {
	const token = req.headers['x-token'];

	if (token) {
		try {
			return await jwt.verify(token, process.env.JWT_SECRET);
		} catch(e) {
			throw new AuthenticationError('Your session has expired. Please sign in again');
		}
	}
};

const server = new ApolloServer({
	introspection: true,
	typeDefs: schema,
	resolvers,
	formatError: error => {
		const message = error.message
			.replace('SequelizeValidationError: ', '')
			.replace('Validation Error: ', '');

		return {
			...error,
			message
		};
	},
	context: async ({ req, connection }) => {
		if (connection) {
			return {
				models,
				loaders: {
					user: new DataLoader(keys =>
							loaders.user.batchUsers(keys, models),
						),
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
					user: new DataLoader(keys =>
						loaders.user.batchUsers(keys, models),
					),
				},
			};
		}
	},
});

server.applyMiddleware({ app, path: '/graphql'});

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

// const isTest = !!process.env.TEST_DATABASE_URL;
// const isProduction = !!process.env.DATABASE_URL;

const port = process.env.PORT || 8000;

sequelize.sync({

}).then(async () => {
	httpServer.listen({ port }, () => {
		console.log(`Apollo Server is running on http://localhost:${port}/graphql`);
	});
});

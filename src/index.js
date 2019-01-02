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

const batchUsers = async (keys, models) => {
	const users = await models.User.findAll({
		where: {
			id: {
				$in: keys,
			},
		},
	});

	return keys.map(key =>
		users.find(user => user.id === key));
};

const batchMessages = async (keys, models) => {
	const messages = await models.Message.findAll({
		where: {
			id: {
				$in: keys,
			},
		},
	});

	return keys.map(key =>
		messages.find(message => message.id === key));
}

const userLoader = new DataLoader(keys =>
	batchUsers(keys, models));

const messageLoader = new DataLoader(keys =>
	batchMessages(keys, models));

const server = new ApolloServer({
	introspection: true,
	playground: true,
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
					user: userLoader,
					message: messageLoader,
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
					user: userLoader,
					message: messageLoader,
				},
			};
		}
	},
});

server.applyMiddleware({ app, path: '/graphql'});

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

const port = process.env.PORT || 8000;

sequelize.sync({

}).then(async () => {
	httpServer.listen({ port }, () => {
		console.log(`Apollo Server is running on http://localhost:${port}/graphql`);
	});
});



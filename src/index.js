import express from 'express';
import bodyParser from 'body-parser';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import path from 'path';
import { fileLoader, mergeTypes, mergeResolvers } from 'merge-graphql-schemas';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';

import dotenv from 'dotenv';
dotenv.load();

import models from './models';
import { refreshTokens } from './auth';

import { JWT_SECRET, JWT_SECRET2 } from './config';


const typeDefs = mergeTypes(fileLoader(path.join(__dirname, './schema')));

const resolvers = mergeResolvers(fileLoader(path.join(__dirname, './resolvers')));

const schema = makeExecutableSchema({
	typeDefs,
	resolvers,
});

const app = express();

app.use(cors('*'));

const addUser = async (req, res, next) => {
	const token = req.headers['x-token'];
	if (token) {
		try {
			const { user } = jwt.verify(token, JWT_SECRET);
			req.user = user;
		} catch (err) {
			const refreshToken = req.headers['x-refresh-token'];
			const newTokens = await refreshTokens(token, refreshToken, models, JWT_SECRET, JWT_SECRET2);
			if (newTokens.token && newTokens.refreshToken) {
				res.set('Access-Control-Expose-Headers', 'x-token, x-refresh-token');
				res.set('x-token', newTokens.token);
				res.set('x-refresh-token', newTokens.refreshToken);
			}
			req.user = newTokens.user;
		}
	}
	next();
};

app.use(addUser);

const graphqlEndpoint = '/graphql';

app.use(
	graphqlEndpoint,
	bodyParser.json(),
	graphqlExpress(req => ({
		schema,
		context: {
			models,
			user: req.user,
			JWT_SECRET,
			JWT_SECRET2,
		},
	})),
);

app.use(
	'/graphiql',
	graphiqlExpress({
		endpointURL: graphqlEndpoint,
		subscriptionsEndpoint: 'ws://localhost:8081/subscriptions',
	}),
);

const server = createServer(app);

models.sequelize.sync({}).then(() => {
	server.listen(8081, () => {
		new SubscriptionServer(
			{
				execute,
				subscribe,
				schema,
				onConnect: async ({ token, refreshToken }, webSocket) => {
					if (token && refreshToken) {
						try {
							const { user } = jwt.verify(token, JWT_SECRET);
							return { models, user };
						} catch (err) {
							const newTokens = await refreshTokens(token, refreshToken, models, JWT_SECRET, JWT_SECRET2);
							return { models, user: newTokens.user };
						}
					}

					return { models };
				},
			},
			{
				server,
				path: '/subscriptions',
			},
		);
	});
});


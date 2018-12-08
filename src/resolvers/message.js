import Sequelize from 'sequelize';
import { combineResolvers } from 'graphql-resolvers';

import pubsub, { EVENTS } from '../subscription';
import { isAuthenticated, isMessageOwner } from './authorization';

export default {
	Query: {
		messages: async (parent, { limit = 100 }, { models }) => {

			const messages = await models.Message.findAll({
				order: [['createdAt', 'DESC']],
				limit: limit + 1
			});

			const hasNextPage = messages.length > limit;
			// const edges = hasNextPage ? messages.slice(0, -1) : messages;

			return {
				// edges,
				pageInfo: {
					hasNextPage
				},
			};
		},
		message: async (parent, { id }, { models }) => {
			return await models.Message.findById(id);
			},
		},

		Mutation: {
			createMessage: combineResolvers(
				isAuthenticated,
				async (parent, { text }, { models, me }) => {
					const message = await models.Message.create({
						text,
						userId: me.id
					});

					pubsub.publish(EVENTS.MESSAGE.CREATED, {
						messageCreated: { message },
					});

					return message;
				},
			),

			deleteMessage: combineResolvers(
				isAuthenticated,
				isMessageOwner,
				async (parent, { id }, { models }) => {
					return await models.Message.destroy({ where: { id } });
				},
			),
		},

		Message: {
			user: async (message, args, { loaders }) => {
				return await loaders.user.load(message.userId);
			},
		},

		Subscription: {
			messageCreated: {
				subscribe: () => pubsub.asyncIterator(EVENTS.MESSAGE.CREATED)
			},
		},
};

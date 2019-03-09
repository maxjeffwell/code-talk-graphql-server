import Sequelize from 'sequelize';
import { combineResolvers } from 'graphql-resolvers';
import { withFilter } from 'graphql-subscriptions';

import { isAuthenticated, isMessageOwner } from './authorization';
import PubSub, { EVENTS } from '../subscription';

const toCursorHash = string => Buffer.from(string).toString('base64');

const fromCursorHash = string =>
	Buffer.from(string, 'base64').toString('ascii');

export default {
	Query: {
		messages: combineResolvers(
			isAuthenticated,
			async (parent, { cursor, limit = 10 }, { models }) => {
			const cursorOptions = cursor ? {
					where: {
						createdAt: {
							[Sequelize.Op.lt]: fromCursorHash(cursor),
						},
					},
				}
				: {};

			const messages = await models.Message.findAll({
				order: [['createdAt', 'DESC']],
				limit: limit + 1,
				...cursorOptions,
			});

			const hasNextPage = messages.length > limit;
			const edges = hasNextPage ? messages.slice(0, -1) : messages;

			return {
				edges,
				pageInfo: {
					hasNextPage,
					endCursor: toCursorHash(
						edges[edges.length - 1].createdAt.toString(),
					),
				},
			};
			}),

			message: async (parent, { id }, { models }) =>
			await models.Message.findByPk(id),
},

	Mutation: {
		createMessage: combineResolvers(
			isAuthenticated,
			async (parent, { text, roomId }, { models, me }) => {
				const message = await models.Message.create({
					text,
					roomId,
					userId: me.id,
				});

				PubSub.publish(EVENTS.MESSAGE.CREATED, {
					roomId: args.roomId,
					messageCreated: { message },
				});

				return message;
			}),

		deleteMessage: combineResolvers(
			isAuthenticated,
			isMessageOwner,
			async (parent, { id }, { models }) => {
				return await models.Message.destroy({ where: { id } });
			},
		),
	},

	Message: {
		user: ({ user, userId }, args, { loaders }) => {
			if (user) {
				return user;
			}
			return loaders.user.load(userId);
		},
	},

	Subscription: {
		messageCreated: {
			subscribe: withFilter(() => PubSub.asyncIterator(EVENTS.MESSAGE.CREATED),
				(payload, args) => payload.roomId === args.roomId,
			),
		},
	},
};

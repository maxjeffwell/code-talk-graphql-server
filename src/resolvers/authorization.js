import { ForbiddenError } from 'apollo-server-express';
import { combineResolvers, skip } from 'graphql-resolvers';

export const isAuthenticated = (parents, args, { me }) =>
  me ? skip : new ForbiddenError ('Not authenticated as a user');

export const isAdmin = combineResolvers(
  isAuthenticated,
  (parent, args, { me: { role } }) =>
    role === 'ADMIN'
  ? skip : new ForbiddenError('Not authenticated as an administrator')
);

export const isMessageOwner = async (parent, { id }, { models, me}) => {
  const messageId = parseInt(id, 10);
  const message = await models.Message.findByPk(messageId, { raw: true });

  if (!message) {
    throw new ForbiddenError('Message not found');
  }

  if (message.userId !== me.id) {
    throw new ForbiddenError('Not authenticated as message owner');
  }

  return skip;
};



import { ForbiddenError } from 'apollo-server';
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
  const message = await models.Message.findByPk(id, { raw: true });

  if (message.userId !== me.id) {
    throw new ForbiddenError('Not authenticated as message owner');
  }

  return skip;
};



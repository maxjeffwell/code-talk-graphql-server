import { GraphQLDateTime } from 'graphql-iso-date';

import userResolvers from '../resolvers/user';
import messageResolvers from '../resolvers/message';
import editorResolvers from '../resolvers/editor';
import uploadsResolvers from './uploads';

const customScalarResolver = {
  Date: GraphQLDateTime
};

export default [
  customScalarResolver,
  userResolvers,
  messageResolvers,
  editorResolvers,
  uploadsResolvers,
];

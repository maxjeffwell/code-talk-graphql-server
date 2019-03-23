import { GraphQLDateTime } from 'graphql-iso-date';

import userResolvers from '../resolvers/user';
import messageResolvers from '../resolvers/message';
// import roomResolvers from '../resolvers/room';
import editorResolvers from '../resolvers/editor';

const customScalarResolver = {
  Date: GraphQLDateTime,
};

export default [
  customScalarResolver,
  userResolvers,
  messageResolvers,
  // roomResolvers,
  editorResolvers,
];

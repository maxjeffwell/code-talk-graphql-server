import { DateTime } from 'graphql-scalars';

import userResolvers from '../resolvers/user';
import messageResolvers from '../resolvers/message';
// import roomResolvers from '../resolvers/room';
import editorResolvers from '../resolvers/editor-minimal';

const customScalarResolver = {
  Date: DateTime,
};

export default [
  customScalarResolver,
  userResolvers,
  messageResolvers,
  // roomResolvers,
  editorResolvers,
];

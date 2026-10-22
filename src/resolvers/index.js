import { DateTimeResolver } from 'graphql-scalars';

import userResolvers from './user';
import messageResolvers from './message';
import roomResolvers from './room';
import editorResolvers from './editor-minimal';
import aiResolvers from './ai';

const customScalarResolver = {
  Date: DateTimeResolver,
};

export default [
  customScalarResolver,
  userResolvers,
  messageResolvers,
  roomResolvers,
  editorResolvers,
  aiResolvers,
];

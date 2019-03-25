import { GraphQLDateTime } from 'graphql-iso-date';
import { GraphQLUpload } from 'graphql-upload';

import userResolvers from '../resolvers/user';
import messageResolvers from '../resolvers/message';
import editorResolvers from '../resolvers/editor';
import uploadsResolvers from './uploads';

const customScalarResolver = {
  Date: GraphQLDateTime
};

const uploadScalarResolver = {
  Upload: GraphQLUpload
};

export default [
  customScalarResolver,
  uploadScalarResolver,
  userResolvers,
  messageResolvers,
  editorResolvers,
  uploadsResolvers,
];

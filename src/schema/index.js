import { gql } from 'apollo-server-express';

import userSchema from './user';
import messageSchema from './message';
import roomSchema from './room';
import editorSchema from './editor';
import aiSchema from './ai';

const linkSchema = gql`
    scalar Date

    type Query {
        _: Boolean
    }
    type Mutation {
        _: Boolean
    }
    type Subscription {
        _: Boolean
    }
`;

export default [linkSchema, userSchema, messageSchema, roomSchema, editorSchema, aiSchema];

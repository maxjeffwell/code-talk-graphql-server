import { gql } from 'apollo-server-express';

export default gql`
    extend type Query {
        users: [User!]
        user(id: ID!): User
        me: User
    }

    extend type Mutation {
        signUp(username: String!, email: String!, password: String!): AuthPayload!
        signIn(login: String!, password: String!): AuthPayload!
        signOut: Boolean!
        updateUser(username: String!): User!
        deleteUser(id: ID!): Boolean!
    }

    """
    Authentication response - tokens are set via httpOnly cookies
    """
    type AuthPayload {
        success: Boolean!
        user: User
    }

    type User {
        id: ID!
        username: String!
        email: String!
        role: String
        messages: [Message!]
#        room: [Room!]
    }
`;


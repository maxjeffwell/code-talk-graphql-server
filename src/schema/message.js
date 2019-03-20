import { gql } from 'apollo-server-express';

export default gql`
    extend type Query {
        messages(cursor: String, limit: Int roomId: ID!): MessageConnection!
        message(id: ID!): Message!
    }
    
    extend type Mutation {
        createMessage(text: String!, roomId: ID!): Message!
        deleteMessage(id: ID!): Boolean!
    }

    extend type Subscription {
        messageCreated(roomId: ID!): MessageCreated!
    }
    
    type MessageConnection {
        edges: [Message!]!
        pageInfo: PageInfo!
    }

    type PageInfo {
        hasNextPage: Boolean!
        endCursor: String!
    }

    type Message {
        id: ID!
        text: String
        createdAt: Date!
        user: User!
        room: Room
        roomId: ID!
        userId: ID!
    }
    
    type MessageCreated {
        message: Message!
    }
`;

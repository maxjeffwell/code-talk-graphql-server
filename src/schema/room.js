import { gql } from 'apollo-server-express';

export default gql`
    extend type Query {
        rooms(id: ID!): [Room!]
    }

    extend type Mutation {
        createRoom(name: String!): Room!
        deleteRoom(id: ID!): Boolean!

    }
    type Room {
        id: ID!
        name: String!
        users: [User!]
    }

    extend type Subscription {
        editorContentState: String!
        roomJoined: socketChannelSubscribeResponse!
        roomLeft: socketChannelUnsubscribeResponse!
    }
    type socketChannelSubscribeResponse {
        channelState: String!
    }

    type socketChannelUnsubscribeResponse {
        channelState: String!
    }
`

import { gql } from 'apollo-server-express';

export default gql`
    extend type Query {
        rooms: [Room]!
        room(id: ID!): Room!
    }

    extend type Mutation {
        createRoom(name: String!): Room!
        deleteRoom(id: ID!): Boolean!
    }

    extend type Subscription {
        roomJoined: SocketChannelSubscribeResponse!
        roomLeft: SocketChannelUnsubscribeResponse!
        roomCreated: RoomCreated!
    }
    
    type Room {
        id: ID!
        title: String!
        users: [User!]
    }

    type SocketChannelSubscribeResponse {
        channelState: String!
    }

    type SocketChannelUnsubscribeResponse {
        channelState: String!
    }
  
    type RoomCreated {
        room: Room!
    }
`;

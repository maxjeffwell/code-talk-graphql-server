import { gql } from 'apollo-server-express';

export default gql`
    extend type Query {
        rooms: [Room]!
        room: Room!
    }

    extend type Mutation {
        createRoom(title: String!): Room!
        deleteRoom(id: ID!): Boolean!
    }

    extend type Subscription {
        userJoined: User!
        userLeft: User!
        roomCreated: RoomCreated
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

import { gql } from 'apollo-server-express';

export default gql`
    extend type Query {
        rooms(cursor: String, limit: Int): RoomConnection!
        room(id: ID!): Room!
    }

    extend type Mutation {
        createRoom(title: String!): Room!
        deleteRoom(id: ID!): Boolean!
    }

    extend type Subscription {
#        userJoined: User!
#        userLeft: User!
        roomCreated: RoomCreated
    }
    
    type RoomConnection {
        edges: [Room!]!
        pageInfo: PageInfo!
    }
    
    type Room {
        id: ID!
        title: String!
        createdAt: Date!
        users: [User!]
    }

#    type SocketChannelSubscribeResponse {
#        channelState: String!
#    }
#
#    type SocketChannelUnsubscribeResponse {
#        channelState: String!
#    }
  
    type RoomCreated {
        room: Room!
    }
`;

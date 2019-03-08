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
        messages: [Message!]
    }

    type RoomCreated {
        room: Room!
    }
`;

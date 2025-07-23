import { gql } from 'apollo-server-express';

export default gql`
    extend type Query {
        rooms(cursor: String, limit: Int): RoomConnection!
        room(id: ID!): Room!
    }

    extend type Mutation {
        createRoom(title: String!): Room!
        deleteRoom(id: ID!): Boolean!
        joinRoom(roomId: ID!): Room!
        leaveRoom(roomId: ID!): Boolean!
    }

    extend type Subscription {
        roomCreated: RoomCreated!
        roomDeleted: RoomDeleted!
        roomUserJoined: RoomUserJoined!
        roomUserLeft: RoomUserLeft!
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
        messages(cursor: String, limit: Int): MessageConnection!
    }

    type RoomCreated {
        room: Room!
    }

    type RoomDeleted {
        id: ID!
    }

    type RoomUserJoined {
        room: Room!
        user: User!
    }

    type RoomUserLeft {
        roomId: ID!
        userId: ID!
    }
`;

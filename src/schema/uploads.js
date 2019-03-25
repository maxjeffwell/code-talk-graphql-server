import { gql } from 'apollo-server-express';

export default gql`
    
    extend type Query {
        uploads: [File]
    }

    extend type Mutation {
        uploadFile(file: Upload!): Boolean!
        uploadFiles(files: [Upload!]!): [File!]!
    }

    type File {
        id: ID!
        filename: String!
        mimetype: String!
        path: String!
    }
`;
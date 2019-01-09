import { gql } from 'apollo-server-express';

export default gql`
    extend type Query {
        readCode: Code!
    }
    
    extend type Mutation {
        typeCode(code: CodeInput!): Code!
    }
    
    extend type Subscription {
        typingCode: Code!
    }
    
    input CodeInput {
        body: String
    }
    
    type Code {
        body: String
    }
`;

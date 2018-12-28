import { gql } from 'apollo-server-express';

export default gql`
    extend type Subscription {
        editorContent: EditorContent!
    }

    type EditorContent {
        editor: Editor!
    }
    
    type Editor {
        code: String!
    }
`;

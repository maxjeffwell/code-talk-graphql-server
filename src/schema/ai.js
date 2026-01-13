import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    """
    Check AI Gateway health status
    """
    aiHealth: AIHealth!
  }

  extend type Mutation {
    """
    Send a message to the AI assistant and get a response
    """
    sendAIMessage(
      content: String!
      conversationHistory: [ChatMessageInput!]
    ): AIMessageResponse!

    """
    Explain a code snippet
    """
    explainCode(
      code: String!
      language: String
    ): CodeExplanation!

    """
    Generate documentation for code
    """
    generateDocumentation(
      code: String!
      language: String!
      style: String
    ): Documentation!

    """
    Generate quiz questions about code concepts
    """
    generateCodeQuiz(
      topic: String!
      difficulty: String
      count: Int
    ): CodeQuiz!
  }

  input ChatMessageInput {
    role: String!
    content: String!
  }

  type AIMessageResponse {
    id: ID!
    content: String!
    role: String!
    timestamp: String!
    backend: String
    model: String
  }

  type AIHealth {
    success: Boolean!
    gateway: GatewayHealth
    error: String
  }

  type GatewayHealth {
    status: String!
    gateway: String
    backend: BackendHealth
  }

  type BackendHealth {
    status: String
    model_loaded: Boolean
  }

  type CodeExplanation {
    success: Boolean!
    explanation: String!
    language: String!
    code: String!
  }

  type Documentation {
    success: Boolean!
    documentation: String!
    language: String!
    style: String
  }

  type CodeQuiz {
    success: Boolean!
    topic: String!
    difficulty: String!
    count: Int!
    questions: [QuizQuestion!]!
  }

  type QuizQuestion {
    question: String!
    answer: String!
  }
`;

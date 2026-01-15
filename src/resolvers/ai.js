import { combineResolvers } from 'graphql-resolvers';
import { isAuthenticated } from './authorization';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://shared-ai-gateway:8002';

// Note: fetch is a global in Node 18+, we use it directly without assignment

export default {
  Query: {
    // Health check is public
    aiHealth: async () => {
      try {
        const response = await fetch(`${AI_GATEWAY_URL}/health`);
        const data = await response.json();

        return {
          success: true,
          gateway: {
            status: data.status,
            gateway: data.gateway,
            backend: data.backend
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          gateway: null
        };
      }
    }
  },

  Mutation: {
    sendAIMessage: combineResolvers(
      isAuthenticated,
      async (parent, { content, conversationHistory = [] }) => {
      try {
        // Build messages array with history
        const messages = [
          ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content }
        ];

        const response = await fetch(`${AI_GATEWAY_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-App-Name': 'code-talk'
          },
          body: JSON.stringify({
            messages,
            context: {
              app: 'code-talk'
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `AI Gateway error: ${response.status}`);
        }

        const data = await response.json();

        return {
          id: `ai-${Date.now()}`,
          content: data.response,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          backend: data.backend || null,
          model: data.model || null
        };
      } catch (error) {
        throw new Error(`Failed to get AI response: ${error.message}`);
      }
    }),

    explainCode: combineResolvers(
      isAuthenticated,
      async (parent, { code, language = 'unknown' }) => {
      try {
        const response = await fetch(`${AI_GATEWAY_URL}/api/ai/explain-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language
          })
        });

        if (!response.ok) {
          throw new Error(`AI Gateway error: ${response.status}`);
        }

        const data = await response.json();

        return {
          success: true,
          explanation: data.explanation,
          language: data.language,
          code: code.substring(0, 100) + (code.length > 100 ? '...' : '')
        };
      } catch (error) {
        throw new Error(`Failed to explain code: ${error.message}`);
      }
    }),

    generateDocumentation: combineResolvers(
      isAuthenticated,
      async (parent, { code, language, style = 'jsdoc' }) => {
      try {
        const prompt = `Generate ${style} documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Include:
- Function/class description
- Parameter descriptions
- Return value description
- Usage examples (if appropriate)

Documentation:`;

        const response = await fetch(`${AI_GATEWAY_URL}/api/ai/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            app: 'code',
            maxTokens: 400
          })
        });

        if (!response.ok) {
          throw new Error(`AI Gateway error: ${response.status}`);
        }

        const data = await response.json();

        return {
          success: true,
          documentation: data.response,
          language,
          style
        };
      } catch (error) {
        throw new Error(`Failed to generate documentation: ${error.message}`);
      }
    }),

    generateCodeQuiz: combineResolvers(
      isAuthenticated,
      async (parent, { topic, difficulty = 'medium', count = 3 }) => {
      try {
        const response = await fetch(`${AI_GATEWAY_URL}/api/ai/quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            difficulty,
            count
          })
        });

        if (!response.ok) {
          throw new Error(`AI Gateway error: ${response.status}`);
        }

        const data = await response.json();

        return {
          success: true,
          topic,
          difficulty,
          count: data.count || count,
          questions: data.questions || []
        };
      } catch (error) {
        throw new Error(`Failed to generate quiz: ${error.message}`);
      }
    })
  }
};

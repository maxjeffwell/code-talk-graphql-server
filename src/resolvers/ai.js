const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://shared-ai-gateway:8002';

// Use Node.js built-in fetch (available in Node 18+)
// No need for node-fetch package since we require Node 18+
const fetch = global.fetch;

export default {
  Query: {
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
    explainCode: async (parent, { code, language = 'unknown' }) => {
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
    },

    generateDocumentation: async (parent, { code, language, style = 'jsdoc' }) => {
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
    },

    generateCodeQuiz: async (parent, { topic, difficulty = 'medium', count = 3 }) => {
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
    }
  }
};

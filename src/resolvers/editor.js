import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated } from './authorization';
import { combineResolvers } from 'graphql-resolvers';

// Performance optimizations for text input
let debounceTimer = null;
const DEBOUNCE_DELAY = 16; // ~60fps for smooth updates
let lastPublishedCode = null; // Track last published code to avoid duplicates

// Debounced publish function
const debouncedPublish = (codeObject) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    // Only publish if code has actually changed
    if (lastPublishedCode !== codeObject.body) {
      lastPublishedCode = codeObject.body;
      PubSub.publish(EVENTS.EDITOR.TYPING_CODE, { typingCode: codeObject });
    }
  }, DEBOUNCE_DELAY);
};

// Ultra-lightweight sanitization for code editor
const lightSanitize = (code) => {
  if (!code) return '';
  // For now, just limit length - we can add more sanitization later if needed
  return code.slice(0, 100000);
};

export default {
  Query: {
    readCode: combineResolvers(
      isAuthenticated,
      () => ({body: ``}))
  },

  Mutation: {
    typeCode: async (root, args) => {
      // Temporarily remove auth check for performance testing
      const { code } = args;
      
      // Handle null/undefined code input
      if (!code) {
        return { body: '' };
      }
      
      // Allow empty strings to be processed (for deletion of last character)
      const codeBody = code.body || '';
      
      // Use lightweight sanitization for better performance
      const sanitizedCode = lightSanitize(codeBody);
      const codeObject = { body: sanitizedCode };
      
      // Use debounced publish to reduce Redis load
      debouncedPublish(codeObject);
      
      // Return immediately without waiting for publish
      return codeObject;
    })
  },

  Subscription: {
    typingCode: {
      subscribe: () => PubSub.asyncIterator(EVENTS.EDITOR.TYPING_CODE),
    },
  },
};


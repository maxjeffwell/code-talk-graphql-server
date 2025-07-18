import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated } from './authorization';
import { combineResolvers } from 'graphql-resolvers';

// Performance optimizations for text input
const debounceTimers = new Map(); // Use Map to track timers per user/session
const DEBOUNCE_DELAY = 16; // ~60fps for smooth updates
const lastPublishedCodes = new Map(); // Track last published code per user/session

// Debounced publish function with user/session context
const debouncedPublish = (codeObject, userId) => {
  const timerKey = userId || 'anonymous';
  
  // Clear existing timer for this user
  if (debounceTimers.has(timerKey)) {
    clearTimeout(debounceTimers.get(timerKey));
  }
  
  // For delete operations (when code is getting shorter), publish immediately
  const lastCode = lastPublishedCodes.get(timerKey) || '';
  const isDeleting = codeObject.body.length < lastCode.length;
  
  if (isDeleting) {
    // Immediate publish for delete operations
    lastPublishedCodes.set(timerKey, codeObject.body);
    PubSub.publish(EVENTS.EDITOR.TYPING_CODE, { typingCode: codeObject });
  } else {
    // Debounced publish for typing
    const timer = setTimeout(() => {
      // Only publish if code has actually changed
      if (lastPublishedCodes.get(timerKey) !== codeObject.body) {
        lastPublishedCodes.set(timerKey, codeObject.body);
        PubSub.publish(EVENTS.EDITOR.TYPING_CODE, { typingCode: codeObject });
      }
      debounceTimers.delete(timerKey);
    }, DEBOUNCE_DELAY);
    
    debounceTimers.set(timerKey, timer);
  }
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
    typeCode: async (root, args, context) => {
      // Temporarily remove auth check for performance testing
      const { code } = args;
      const userId = context.me?.id;
      
      // Handle null/undefined code input
      if (!code) {
        return { body: '' };
      }
      
      // Allow empty strings to be processed (for deletion of last character)
      const codeBody = code.body || '';
      
      // Use lightweight sanitization for better performance
      const sanitizedCode = lightSanitize(codeBody);
      const codeObject = { body: sanitizedCode };
      
      // Use debounced publish to reduce Redis load with user context
      debouncedPublish(codeObject, userId);
      
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


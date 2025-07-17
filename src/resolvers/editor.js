import PubSub, { EVENTS } from '../subscription';
import { isAuthenticated } from './authorization';
import { combineResolvers } from 'graphql-resolvers';
import DOMPurify from 'isomorphic-dompurify';

// Performance optimizations for text input
let debounceTimer = null;
let sanitizeCache = new Map();
const DEBOUNCE_DELAY = 100; // 100ms debounce
const CACHE_SIZE_LIMIT = 1000;

// Debounced publish function
const debouncedPublish = (codeObject) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    PubSub.publish(EVENTS.EDITOR.TYPING_CODE, { typingCode: codeObject });
  }, DEBOUNCE_DELAY);
};

// Cached sanitization function
const cachedSanitize = (code) => {
  if (sanitizeCache.has(code)) {
    return sanitizeCache.get(code);
  }
  
  const sanitized = DOMPurify.sanitize(code);
  
  // Manage cache size
  if (sanitizeCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = sanitizeCache.keys().next().value;
    sanitizeCache.delete(firstKey);
  }
  
  sanitizeCache.set(code, sanitized);
  return sanitized;
};

export default {
  Query: {
    readCode: combineResolvers(
      isAuthenticated,
      () => ({body: ``}))
  },

  Mutation: {
    typeCode: combineResolvers(
      isAuthenticated,
      (root, args) => {
      const { code } = args;
      
      // Skip processing if code is empty or unchanged
      if (!code || !code.body) {
        return { body: '' };
      }
      
      // Use cached sanitization
      const sanitizedCode = cachedSanitize(code.body);
      const codeObject = { body: sanitizedCode };
      
      // Use debounced publish to reduce Redis load
      debouncedPublish(codeObject);
      
      return codeObject;
    })
  },

  Subscription: {
    typingCode: {
      subscribe: () => PubSub.asyncIterator(EVENTS.EDITOR.TYPING_CODE),
    },
  },
};


/**
 * Distributed Rate Limiter using Upstash Redis
 *
 * Uses Upstash for rate limiting to support horizontal scaling.
 * Falls back to in-memory rate limiting if Upstash is not configured.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import logger from './logger.js';
import { upstash } from '../config/index.js';

// Check if Upstash is configured
const isUpstashConfigured = () => {
  return upstash.enabled;
};

// Create Upstash Redis client
const createUpstashClient = () => {
  if (!isUpstashConfigured()) {
    return null;
  }

  try {
    return new Redis({
      url: upstash.url,
      token: upstash.token,
    });
  } catch (error) {
    logger.error('Failed to create Upstash Redis client', { error: error.message });
    return null;
  }
};

// Create rate limiters for different purposes
const upstashClient = createUpstashClient();

// App-specific prefix to allow sharing Upstash database with other apps
const APP_PREFIX = 'codetalk:';

// Auth rate limiter: 5 attempts per 15 minutes (sliding window)
const authRateLimiter = upstashClient
  ? new Ratelimit({
      redis: upstashClient,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: `${APP_PREFIX}ratelimit:auth:`,
      analytics: true,
    })
  : null;

// General API rate limiter: 100 requests per minute
const apiRateLimiter = upstashClient
  ? new Ratelimit({
      redis: upstashClient,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      prefix: `${APP_PREFIX}ratelimit:api:`,
      analytics: true,
    })
  : null;

// GraphQL rate limiter: 60 requests per minute
const graphqlRateLimiter = upstashClient
  ? new Ratelimit({
      redis: upstashClient,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: `${APP_PREFIX}ratelimit:graphql:`,
      analytics: true,
    })
  : null;

// ============================================================================
// Fallback in-memory rate limiter (for development/testing without Upstash)
// ============================================================================

const inMemoryStore = new Map();

const inMemoryRateLimit = (identifier, maxAttempts, windowMs) => {
  const now = Date.now();
  const key = identifier;

  if (!inMemoryStore.has(key)) {
    inMemoryStore.set(key, []);
  }

  const attempts = inMemoryStore.get(key);
  const validAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
  inMemoryStore.set(key, validAttempts);

  if (validAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...validAttempts);
    const resetTime = oldestAttempt + windowMs;
    return {
      success: false,
      remaining: 0,
      reset: resetTime,
      limit: maxAttempts,
    };
  }

  validAttempts.push(now);
  inMemoryStore.set(key, validAttempts);

  return {
    success: true,
    remaining: maxAttempts - validAttempts.length,
    reset: now + windowMs,
    limit: maxAttempts,
  };
};

const clearInMemoryAttempts = (identifier) => {
  inMemoryStore.delete(identifier);
};

// ============================================================================
// Exported rate limiting functions
// ============================================================================

/**
 * Check auth rate limit (5 attempts per 15 minutes)
 * @param {string} identifier - User identifier (email, IP, etc.)
 * @returns {Promise<{success: boolean, remaining: number, reset: number}>}
 */
export const checkAuthRateLimit = async (identifier) => {
  if (authRateLimiter) {
    try {
      const result = await authRateLimiter.limit(identifier);

      if (!result.success) {
        logger.warn('Auth rate limit exceeded (Upstash)', {
          identifier,
          remaining: result.remaining,
          reset: result.reset,
        });
      }

      return result;
    } catch (error) {
      logger.error('Upstash rate limit error, falling back to in-memory', { error: error.message });
      // Fall through to in-memory
    }
  }

  // Fallback to in-memory
  const result = inMemoryRateLimit(identifier, 5, 15 * 60 * 1000);

  if (!result.success) {
    logger.warn('Auth rate limit exceeded (in-memory)', {
      identifier,
      remaining: result.remaining,
    });
  }

  return result;
};

/**
 * Check API rate limit (100 requests per minute)
 * @param {string} identifier - Client identifier (IP, user ID, etc.)
 * @returns {Promise<{success: boolean, remaining: number, reset: number}>}
 */
export const checkApiRateLimit = async (identifier) => {
  if (apiRateLimiter) {
    try {
      return await apiRateLimiter.limit(identifier);
    } catch (error) {
      logger.error('Upstash API rate limit error', { error: error.message });
    }
  }

  return inMemoryRateLimit(identifier, 100, 60 * 1000);
};

/**
 * Check GraphQL rate limit (60 requests per minute)
 * @param {string} identifier - Client identifier
 * @returns {Promise<{success: boolean, remaining: number, reset: number}>}
 */
export const checkGraphqlRateLimit = async (identifier) => {
  if (graphqlRateLimiter) {
    try {
      return await graphqlRateLimiter.limit(identifier);
    } catch (error) {
      logger.error('Upstash GraphQL rate limit error', { error: error.message });
    }
  }

  return inMemoryRateLimit(identifier, 60, 60 * 1000);
};

/**
 * Clear rate limit attempts for an identifier (e.g., after successful login)
 * @param {string} identifier - User identifier
 */
export const clearAuthAttempts = async (identifier) => {
  if (upstashClient) {
    try {
      // Reset by deleting the rate limit key
      await upstashClient.del(`${APP_PREFIX}ratelimit:auth:${identifier}`);
      logger.info('Auth rate limit cleared (Upstash)', { identifier });
      return;
    } catch (error) {
      logger.error('Failed to clear Upstash rate limit', { error: error.message });
    }
  }

  // Fallback to in-memory
  clearInMemoryAttempts(identifier);
  logger.info('Auth rate limit cleared (in-memory)', { identifier });
};

/**
 * Check if Upstash is being used for rate limiting
 * @returns {boolean}
 */
export const isDistributedRateLimiting = () => {
  return !!authRateLimiter;
};

export default {
  checkAuthRateLimit,
  checkApiRateLimit,
  checkGraphqlRateLimit,
  clearAuthAttempts,
  isDistributedRateLimiting,
};

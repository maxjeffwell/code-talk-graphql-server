/**
 * Distributed Rate Limiter using the in-cluster Redis
 *
 * Uses the same Redis as GraphQL subscriptions (REDIS_URL, or REDIS_HOST/...)
 * so every replica shares one sliding-window counter per identifier.
 * Falls back to per-process in-memory limiting if Redis is unreachable.
 */

import Redis from 'ioredis';
import logger from './logger.js';
import { redis as redisConfig } from '../config/index.js';

const REDIS_URL = process.env.REDIS_URL;

// App-specific prefix so keys never collide with other apps on the shared Redis
const APP_PREFIX = 'codetalk:ratelimit:';

// Fail fast: a rate-limit check must never stall a login or request while
// Redis is down. Commands error immediately when disconnected (no offline
// queue, one retry) and the caller falls back to in-memory limiting.
const clientOptions = {
  lazyConnect: false,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  commandTimeout: 500,
  retryStrategy(times) {
    return Math.min(times * 200, 5000);
  },
};

const createRedisClient = () => {
  try {
    if (REDIS_URL) {
      const options = { ...clientOptions };
      if (REDIS_URL.startsWith('rediss://')) {
        options.tls = {}; // verify the server certificate (default CA store)
      }
      return new Redis(REDIS_URL, options);
    }
    if (process.env.REDIS_HOST) {
      return new Redis({
        ...clientOptions,
        host: redisConfig.host,
        port: redisConfig.port,
        username: redisConfig.user,
        password: redisConfig.password,
        db: redisConfig.db,
        tls: redisConfig.tls,
      });
    }
  } catch (error) {
    logger.error('Failed to create rate-limit Redis client', { error: error.message });
  }
  return null;
};

const redisClient = createRedisClient();

if (redisClient) {
  // Without a listener ioredis logs unhandled 'error' events on every retry.
  let lastErrorLog = 0;
  redisClient.on('error', (error) => {
    const now = Date.now();
    if (now - lastErrorLog > 60000) {
      lastErrorLog = now;
      logger.warn('Rate-limit Redis connection error (using in-memory fallback)', {
        error: error.message,
      });
    }
  });
}

// Atomic sliding-window log in a sorted set.
// KEYS[1] = key, ARGV = now(ms), windowMs, limit, member
// Returns { allowed(0/1), count after this call, oldest timestamp in window }
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
local allowed = 0
if count < limit then
  redis.call('ZADD', key, now, ARGV[4])
  count = count + 1
  allowed = 1
end
redis.call('PEXPIRE', key, window)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local oldestTs = now
if oldest[2] then oldestTs = tonumber(oldest[2]) end
return { allowed, count, oldestTs }
`;

if (redisClient) {
  redisClient.defineCommand('slidingWindowLimit', { numberOfKeys: 1, lua: SLIDING_WINDOW_LUA });
}

let memberSeq = 0;

const redisRateLimit = async (scope, identifier, maxAttempts, windowMs) => {
  const now = Date.now();
  const member = `${now}-${process.pid}-${memberSeq++}`;
  const [allowed, count, oldestTs] = await redisClient.slidingWindowLimit(
    `${APP_PREFIX}${scope}:${identifier}`,
    now,
    windowMs,
    maxAttempts,
    member
  );
  return {
    success: allowed === 1,
    remaining: Math.max(0, maxAttempts - count),
    reset: Number(oldestTs) + windowMs,
    limit: maxAttempts,
  };
};

const isRedisReady = () => !!redisClient && redisClient.status === 'ready';

// ============================================================================
// Fallback in-memory rate limiter (used only when Redis is unavailable)
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

const limitWithFallback = async (scope, identifier, maxAttempts, windowMs) => {
  if (isRedisReady()) {
    try {
      return await redisRateLimit(scope, identifier, maxAttempts, windowMs);
    } catch (error) {
      logger.error(`Redis ${scope} rate limit error, falling back to in-memory`, {
        error: error.message,
      });
    }
  }
  return inMemoryRateLimit(`${scope}:${identifier}`, maxAttempts, windowMs);
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
  const result = await limitWithFallback('auth', identifier, 5, 15 * 60 * 1000);

  if (!result.success) {
    logger.warn('Auth rate limit exceeded', {
      identifier,
      remaining: result.remaining,
      reset: result.reset,
      distributed: isRedisReady(),
    });
  }

  return result;
};

/**
 * Check API rate limit (100 requests per minute)
 * @param {string} identifier - Client identifier (IP, user ID, etc.)
 * @returns {Promise<{success: boolean, remaining: number, reset: number}>}
 */
export const checkApiRateLimit = async (identifier) =>
  limitWithFallback('api', identifier, 100, 60 * 1000);

/**
 * Check GraphQL rate limit (60 requests per minute)
 * @param {string} identifier - Client identifier
 * @returns {Promise<{success: boolean, remaining: number, reset: number}>}
 */
export const checkGraphqlRateLimit = async (identifier) =>
  limitWithFallback('graphql', identifier, 60, 60 * 1000);

/**
 * Clear rate limit attempts for an identifier (e.g., after successful login)
 * @param {string} identifier - User identifier
 */
export const clearAuthAttempts = async (identifier) => {
  clearInMemoryAttempts(`auth:${identifier}`);
  if (isRedisReady()) {
    try {
      await redisClient.del(`${APP_PREFIX}auth:${identifier}`);
      logger.info('Auth rate limit cleared (Redis)', { identifier });
      return;
    } catch (error) {
      logger.error('Failed to clear Redis auth rate limit', { error: error.message });
    }
  }
  logger.info('Auth rate limit cleared (in-memory)', { identifier });
};

/**
 * Whether rate limiting is currently shared across replicas (Redis ready)
 * @returns {boolean}
 */
export const isDistributedRateLimiting = () => isRedisReady();

export default {
  checkAuthRateLimit,
  checkApiRateLimit,
  checkGraphqlRateLimit,
  clearAuthAttempts,
  isDistributedRateLimiting,
};

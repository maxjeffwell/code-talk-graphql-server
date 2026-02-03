import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import logger from '../utils/logger.js';
import { redis } from '../config/index.js';

import * as MESSAGE_EVENTS from './message';
import * as EDITOR_EVENTS from './editor';
import * as ROOM_EVENTS from './room';

// Get Redis URL from environment (checked separately for connection string mode)
const REDIS_URL = process.env.REDIS_URL;

const getRedisOptions = () => {
  if (REDIS_URL) {
    const useTls = REDIS_URL.startsWith('rediss://');
    const options = {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        logger.info(`Redis connection attempt ${times}, retrying in ${delay}ms...`);
        return delay;
      },
    };

    if (useTls) {
      options.tls = { rejectUnauthorized: false };
    }

    return options;
  }

  return {
    host: redis.host,
    user: redis.user,
    password: redis.password,
    port: redis.port,
    db: redis.db,
    maxRetriesPerRequest: null,
    tls: redis.tls,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      logger.info(`Redis connection attempt ${times}, retrying in ${delay}ms...`);
      return delay;
    },
  };
};

const redisOptions = getRedisOptions();

const createRedisConnection = () => {
  if (REDIS_URL) {
    return new Redis(REDIS_URL, redisOptions);
  }
  return new Redis(redisOptions);
};

const PubSub = new RedisPubSub({
  publisher: createRedisConnection(),
  subscriber: createRedisConnection(),
});

export const EVENTS = {
  MESSAGE: MESSAGE_EVENTS,
  EDITOR: EDITOR_EVENTS,
  ROOM: ROOM_EVENTS,
};

export default PubSub;

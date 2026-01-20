import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

import * as MESSAGE_EVENTS from './message';
import * as EDITOR_EVENTS from './editor';
import * as ROOM_EVENTS from './room';

const getRedisOptions = () => {
  if (process.env.REDIS_URL) {
    return {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        console.log(`Redis connection attempt ${times}, retrying in ${delay}ms...`);
        return delay;
      },
      tls: {
        rejectUnauthorized: false,
      },
    };
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    user: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      console.log(`Redis connection attempt ${times}, retrying in ${delay}ms...`);
      return delay;
    },
  };
};

const redisOptions = getRedisOptions();

const createRedisConnection = () => {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, redisOptions);
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

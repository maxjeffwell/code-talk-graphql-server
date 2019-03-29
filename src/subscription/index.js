import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

import * as MESSAGE_EVENTS from './message';
import * as EDITOR_EVENTS from './editor';
// import * as ROOM_EVENTS from './room';

const options = {
	host: 'ec2-18-235-137-58.compute-1.amazonaws.com' || '127.0.0.1',
	user: 'h',
	password: 'p10c9cd0650165fbb99062808ee085a1876a4985e41fe55b1b1fba127db6b4009',
	port: 28009,
	retryStrategy: function(times) {
		return Math.max(times * 100, 3000);
	},
};

const PubSub = new RedisPubSub({
	options,
	publisher: new Redis(options),
	subscriber: new Redis(options)
});

export const EVENTS = {
	MESSAGE: MESSAGE_EVENTS,
	EDITOR: EDITOR_EVENTS,
	// ROOM: ROOM_EVENTS,
};

export default PubSub;

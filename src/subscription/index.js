import { RedisPubSub } from 'graphql-redis-subscriptions';

const PubSub = new RedisPubSub({
	connection: {
		host: 'ec2-18-235-137-58.compute-1.amazonaws.com',
		user: 'h',
		password: 'p10c9cd0650165fbb99062808ee085a1876a4985e41fe55b1b1fba127db6b4009',
		port: 28009,
		retry_strategy: options => Math.max(options.attempt * 100, 3000),
	},
});

import * as MESSAGE_EVENTS from './message';
import * as EDITOR_EVENTS from './editor';
import * as ROOM_EVENTS from './room';

export const EVENTS = {
	MESSAGE: MESSAGE_EVENTS,
	EDITOR: EDITOR_EVENTS,
	ROOM: ROOM_EVENTS,
};

export default PubSub;

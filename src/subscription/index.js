import { PubSub } from "apollo-server";

import * as MESSAGE_EVENTS from './message';
import * as EDITOR_EVENTS from './editor';
import * as ROOM_EVENTS from './room';

export const EVENTS = {
	MESSAGE: MESSAGE_EVENTS,
	EDITOR: EDITOR_EVENTS,
	ROOM: ROOM_EVENTS,
};

export default new PubSub();

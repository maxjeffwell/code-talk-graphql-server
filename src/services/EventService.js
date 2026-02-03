/**
 * EventService - Centralized event publishing for real-time features
 *
 * Provides a clean interface for publishing events through Redis pub/sub.
 * Centralizes all event publishing logic that was previously scattered
 * throughout resolvers.
 */

import PubSub, { EVENTS } from '../subscription/index.js';
import logger from '../utils/logger.js';

/**
 * Publish a message created event
 * @param {Object} message - The created message
 */
export const publishMessageCreated = async (message) => {
  try {
    await PubSub.publish(EVENTS.MESSAGE.CREATED, {
      messageCreated: { message },
    });
    logger.debug('Published MESSAGE.CREATED event', { messageId: message.id });
  } catch (error) {
    logger.error('Failed to publish MESSAGE.CREATED event', { error: error.message });
    throw error;
  }
};

/**
 * Publish a message deleted event
 * @param {Object} message - The deleted message
 */
export const publishMessageDeleted = async (message) => {
  try {
    await PubSub.publish(EVENTS.MESSAGE.DELETED, {
      messageDeleted: message,
    });
    logger.debug('Published MESSAGE.DELETED event', { messageId: message.id });
  } catch (error) {
    logger.error('Failed to publish MESSAGE.DELETED event', { error: error.message });
    throw error;
  }
};

/**
 * Publish a room created event
 * @param {Object} room - The created room
 */
export const publishRoomCreated = async (room) => {
  try {
    await PubSub.publish(EVENTS.ROOM.CREATED, {
      roomCreated: { room },
    });
    logger.debug('Published ROOM.CREATED event', { roomId: room.id });
  } catch (error) {
    logger.error('Failed to publish ROOM.CREATED event', { error: error.message });
    throw error;
  }
};

/**
 * Publish a room deleted event
 * @param {string|number} roomId - The deleted room ID
 */
export const publishRoomDeleted = async (roomId) => {
  try {
    await PubSub.publish(EVENTS.ROOM.DELETED, {
      roomDeleted: { id: roomId },
    });
    logger.debug('Published ROOM.DELETED event', { roomId });
  } catch (error) {
    logger.error('Failed to publish ROOM.DELETED event', { error: error.message });
    throw error;
  }
};

/**
 * Publish a room user joined event
 * @param {Object} room - The room with user included
 * @param {Object} user - The user who joined
 */
export const publishRoomUserJoined = async (room, user) => {
  try {
    await PubSub.publish(EVENTS.ROOM.USER_JOINED, {
      roomUserJoined: { room, user },
    });
    logger.debug('Published ROOM.USER_JOINED event', { roomId: room.id, userId: user.id });
  } catch (error) {
    logger.error('Failed to publish ROOM.USER_JOINED event', { error: error.message });
    throw error;
  }
};

/**
 * Publish a room user left event
 * @param {string|number} roomId - The room ID
 * @param {string|number} userId - The user ID who left
 */
export const publishRoomUserLeft = async (roomId, userId) => {
  try {
    await PubSub.publish(EVENTS.ROOM.USER_LEFT, {
      roomUserLeft: { roomId, userId },
    });
    logger.debug('Published ROOM.USER_LEFT event', { roomId, userId });
  } catch (error) {
    logger.error('Failed to publish ROOM.USER_LEFT event', { error: error.message });
    throw error;
  }
};

/**
 * Publish an editor code changed event
 * @param {Object} codeData - The code change data
 */
export const publishEditorChanged = async (codeData) => {
  try {
    await PubSub.publish(EVENTS.EDITOR.CHANGED, {
      editorChanged: codeData,
    });
    logger.debug('Published EDITOR.CHANGED event');
  } catch (error) {
    logger.error('Failed to publish EDITOR.CHANGED event', { error: error.message });
    throw error;
  }
};

export default {
  publishMessageCreated,
  publishMessageDeleted,
  publishRoomCreated,
  publishRoomDeleted,
  publishRoomUserJoined,
  publishRoomUserLeft,
  publishEditorChanged,
};

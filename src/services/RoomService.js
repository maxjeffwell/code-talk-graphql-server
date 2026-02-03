/**
 * RoomService - Business logic for room operations
 *
 * Handles all room-related business logic including:
 * - Creating and deleting rooms
 * - Room membership (join/leave)
 * - Room queries with pagination
 * - Event publishing and cache invalidation
 */

import DOMPurify from 'isomorphic-dompurify';
import { paginatedQuery } from './PaginationService.js';
import {
  publishRoomCreated,
  publishRoomDeleted,
  publishRoomUserJoined,
  publishRoomUserLeft,
} from './EventService.js';
import { purgeCodeTalkCache } from '../utils/cloudflare.js';
import logger from '../utils/logger.js';

/**
 * Create a new room and add the creator as a member
 * @param {Object} models - Sequelize models
 * @param {Object} params - Room parameters
 * @param {string} params.title - Room title
 * @param {number} params.userId - Creator's user ID
 * @returns {Promise<Object>} Created room
 */
export const createRoom = async (models, { title, userId }) => {
  // Sanitize room title
  const sanitizedTitle = DOMPurify.sanitize(title);

  const room = await models.Room.create({
    title: sanitizedTitle,
  });

  // Add creator as first member
  await room.addUser(userId);

  logger.info('Room created', {
    roomId: room.id,
    title: sanitizedTitle,
    createdBy: userId,
  });

  // Publish event for real-time subscribers
  await publishRoomCreated(room);

  // Invalidate CDN cache
  purgeCodeTalkCache();

  return room;
};

/**
 * Get all rooms with pagination
 * @param {Object} models - Sequelize models
 * @param {Object} options - Pagination options
 * @param {string|null} options.cursor - Pagination cursor
 * @param {number} options.limit - Page size
 * @returns {Promise<Object>} Paginated rooms with edges and pageInfo
 */
export const getRooms = async (models, { cursor = null, limit = 5 } = {}) => {
  return paginatedQuery(models.Room, {
    cursor,
    limit,
  });
};

/**
 * Get a single room by ID
 * @param {Object} models - Sequelize models
 * @param {number} id - Room ID
 * @returns {Promise<Object|null>} Room or null if not found
 */
export const getRoomById = async (models, id) => {
  const room = await models.Room.findByPk(id);

  if (!room) {
    throw new Error('Room not found');
  }

  return room;
};

/**
 * Delete a room
 * @param {Object} models - Sequelize models
 * @param {number} id - Room ID to delete
 * @returns {Promise<number>} Number of deleted rows
 * @throws {Error} If room not found
 */
export const deleteRoom = async (models, id) => {
  const room = await models.Room.findByPk(id);

  if (!room) {
    throw new Error('Room not found');
  }

  const result = await models.Room.destroy({ where: { id } });

  logger.info('Room deleted', { roomId: id });

  // Publish event for real-time subscribers
  await publishRoomDeleted(id);

  // Invalidate CDN cache
  purgeCodeTalkCache();

  return result;
};

/**
 * Add a user to a room
 * @param {Object} models - Sequelize models
 * @param {Object} params - Join parameters
 * @param {number} params.roomId - Room ID
 * @param {Object} params.user - User object (with id)
 * @returns {Promise<Object>} Room with user included
 * @throws {Error} If room not found
 */
export const joinRoom = async (models, { roomId, user }) => {
  const room = await models.Room.findByPk(roomId);

  if (!room) {
    throw new Error('Room not found');
  }

  await room.addUser(user.id);

  // Fetch room with the user included for the response
  const roomWithUser = await models.Room.findByPk(roomId, {
    include: [{
      model: models.User,
      where: { id: user.id },
      through: { attributes: [] },
    }],
  });

  logger.info('User joined room', {
    roomId,
    userId: user.id,
    username: user.username,
  });

  // Publish event for real-time subscribers
  await publishRoomUserJoined(roomWithUser, user);

  return roomWithUser;
};

/**
 * Remove a user from a room
 * @param {Object} models - Sequelize models
 * @param {Object} params - Leave parameters
 * @param {number} params.roomId - Room ID
 * @param {number} params.userId - User ID
 * @returns {Promise<boolean>} True on success
 * @throws {Error} If room not found
 */
export const leaveRoom = async (models, { roomId, userId }) => {
  const room = await models.Room.findByPk(roomId);

  if (!room) {
    throw new Error('Room not found');
  }

  await room.removeUser(userId);

  logger.info('User left room', { roomId, userId });

  // Publish event for real-time subscribers
  await publishRoomUserLeft(roomId, userId);

  return true;
};

/**
 * Get all users in a room
 * @param {Object} room - Room instance
 * @returns {Promise<Array>} Array of users
 */
export const getRoomUsers = async (room) => {
  return room.getUsers();
};

export default {
  createRoom,
  getRooms,
  getRoomById,
  deleteRoom,
  joinRoom,
  leaveRoom,
  getRoomUsers,
};

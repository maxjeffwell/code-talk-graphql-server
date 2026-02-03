/**
 * MessageService - Business logic for message operations
 *
 * Handles all message-related business logic including:
 * - Creating messages with sanitization
 * - Retrieving messages with pagination
 * - Deleting messages
 * - Event publishing and cache invalidation
 */

import DOMPurify from 'isomorphic-dompurify';
import { paginatedQuery } from './PaginationService.js';
import { publishMessageCreated, publishMessageDeleted } from './EventService.js';
import { purgeCodeTalkCache } from '../utils/cloudflare.js';
import logger from '../utils/logger.js';

/**
 * Create a new message
 * @param {Object} models - Sequelize models
 * @param {Object} params - Message parameters
 * @param {string} params.text - Message content
 * @param {number} params.userId - Author's user ID
 * @param {number|null} params.roomId - Optional room ID (null for global chat)
 * @returns {Promise<Object>} Created message
 */
export const createMessage = async (models, { text, userId, roomId = null }) => {
  // Sanitize HTML in message text
  const sanitizedText = DOMPurify.sanitize(text);

  const message = await models.Message.create({
    text: sanitizedText,
    userId,
    ...(roomId !== undefined && roomId !== null && { roomId }),
  });

  logger.info('Message created', {
    messageId: message.id,
    userId,
    roomId: roomId || 'global',
  });

  // Publish event for real-time subscribers
  await publishMessageCreated(message);

  // Invalidate CDN cache
  purgeCodeTalkCache();

  return message;
};

/**
 * Get messages with pagination and optional room filtering
 * @param {Object} models - Sequelize models
 * @param {Object} options - Query options
 * @param {string|null} options.cursor - Pagination cursor
 * @param {number} options.limit - Page size
 * @param {number|null} options.roomId - Filter by room (null for global, undefined for all)
 * @returns {Promise<Object>} Paginated messages with edges and pageInfo
 */
export const getMessages = async (models, { cursor = null, limit = 10, roomId } = {}) => {
  const where = {};

  // Handle room filtering
  if (roomId !== undefined) {
    // roomId === null means global messages (no room)
    // roomId === number means specific room
    where.roomId = roomId === null ? null : (
      Number.isInteger(Number(roomId)) ? parseInt(roomId, 10) : null
    );
  }

  return paginatedQuery(models.Message, {
    cursor,
    limit,
    where,
  });
};

/**
 * Get a single message by ID
 * @param {Object} models - Sequelize models
 * @param {number} id - Message ID
 * @returns {Promise<Object|null>} Message or null if not found
 */
export const getMessageById = async (models, id) => {
  return models.Message.findByPk(id);
};

/**
 * Delete a message
 * @param {Object} models - Sequelize models
 * @param {number} id - Message ID to delete
 * @returns {Promise<Object>} Deleted message
 * @throws {Error} If message not found or deletion fails
 */
export const deleteMessage = async (models, id) => {
  const message = await models.Message.findByPk(id);

  if (!message) {
    throw new Error('Message not found');
  }

  const deletedCount = await models.Message.destroy({ where: { id } });

  if (deletedCount === 0) {
    throw new Error('Message could not be deleted');
  }

  logger.info('Message deleted', { messageId: id });

  // Publish event for real-time subscribers
  await publishMessageDeleted(message);

  // Invalidate CDN cache
  purgeCodeTalkCache();

  return message;
};

/**
 * Check if a user owns a message
 * @param {Object} models - Sequelize models
 * @param {number} messageId - Message ID
 * @param {number} userId - User ID to check
 * @returns {Promise<boolean>} True if user owns the message
 */
export const isMessageOwner = async (models, messageId, userId) => {
  const message = await models.Message.findByPk(messageId);
  return message && message.userId === userId;
};

/**
 * Get messages by room with pagination
 * @param {Object} models - Sequelize models
 * @param {number} roomId - Room ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated messages
 */
export const getMessagesByRoom = async (models, roomId, { cursor = null, limit = 5 } = {}) => {
  return paginatedQuery(models.Message, {
    cursor,
    limit,
    where: { roomId },
  });
};

export default {
  createMessage,
  getMessages,
  getMessageById,
  deleteMessage,
  isMessageOwner,
  getMessagesByRoom,
};

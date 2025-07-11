import { Op } from 'sequelize';

export const batchMessages = async (keys, models) => {
  const messages = await models.Message.findAll({
    where: {
      id: {
        [Op.in]: keys,
      },
    },
    order: [['createdAt', 'DESC']]
  });

  const messageMap = new Map(messages.map(message => [message.id, message]));
  return keys.map(key => messageMap.get(key) || null);
};

export const batchMessagesByUser = async (userIds, models) => {
  const messages = await models.Message.findAll({
    where: {
      userId: {
        [Op.in]: userIds,
      },
    },
    order: [['createdAt', 'DESC']],
    limit: 100 // Prevent loading too many messages at once
  });

  // Group messages by userId
  const messagesByUser = new Map();
  messages.forEach(message => {
    if (!messagesByUser.has(message.userId)) {
      messagesByUser.set(message.userId, []);
    }
    messagesByUser.get(message.userId).push(message);
  });

  return userIds.map(userId => messagesByUser.get(userId) || []);
};

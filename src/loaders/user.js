import { Op } from 'sequelize';

export const batchUsers = async (keys, models) => {
  const users = await models.User.findAll({
    where: {
      id: {
        [Op.in]: keys,
      },
    },
    attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt']
  });

  // Create a map for efficient lookup
  const userMap = new Map(users.map(user => [user.id, user]));
  
  // Return users in the same order as keys, null for missing users
  return keys.map(key => userMap.get(key) || null);
};

export const batchUsersByEmail = async (emails, models) => {
  const users = await models.User.findAll({
    where: {
      email: {
        [Op.in]: emails,
      },
    },
    attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt']
  });

  const userMap = new Map(users.map(user => [user.email, user]));
  return emails.map(email => userMap.get(email) || null);
};

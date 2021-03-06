import { Op } from 'sequelize';

export const batchMessages = async (keys, models) => {
  const messages = await models.Message.findAll({
    where: {
      id: {
        [Op.in]: keys,
      },
    },
  });

  return keys.map(key => messages.find(message => message.id === key));
};

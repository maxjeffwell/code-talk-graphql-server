const message = (sequelize, DataTypes) => {
  const Message = sequelize.define('message', {
    text: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true,
      },
    },
  });

  Message.associate = (models) => {
    Message.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'userId',
      },
    });
  };

  Message.associate = (models) => {
    Message.belongsTo(models.Room, {
      foreignKey: {
        name: 'roomId',
        field: 'roomId',
      },
    });
  };

  return Message;
};

export default message;

const message = (sequelize, DataTypes) => {
  const Message = sequelize.define('message', {
    text: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    roomId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null for global messages
    },
  });

  Message.associate = models => {
    Message.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'userId',
      },
    });
  };

  // Message.associate = (models) => {
  //   Message.belongsTo(models.Room, {
  //     foreignKey: {
  //       name: 'roomId',
  //       field: 'roomId',
  //     },
  //     onDelete: 'CASCADE',
  //   });
  // };

  return Message;
};

export default message;

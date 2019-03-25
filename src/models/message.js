const message = (sequelize, DataTypes) => {
  const Message = sequelize.define('message', {
    text: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
  },
  );

  Message.associate = (models) => {
    Message.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'userId',
      },
    });
  };

  return Message;
};

export default message;

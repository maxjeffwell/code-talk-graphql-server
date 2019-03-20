const room = (sequelize, DataTypes) => {
  const Room = sequelize.define('room', {
    title: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: true
      },
    },
  });

  Room.associate = (models) => {
    Room.hasMany(models.Message, {});

    Room.belongsToMany(models.User, {
      through: 'room_member',
      foreignKey: {
        name: 'roomId',
        field: 'roomId',
      },
    });
  };

  return Room;
};

export default room;

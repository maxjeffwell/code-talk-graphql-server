const room = (sequelize, DataTypes) => {
  const Room = sequelize.define('room', {
    title: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isAlphanumeric: {
          notEmpty: true,
          args: true,
          msg: 'The room title can only contain letters and numbers'
        },
      }
    }
  });

  Room.associate = (models) => {
    Room.hasMany(models.Message);
  };

  Room.associate = (models) => {
    Room.hasMany(models.User);
  };

  return Room;
};

export default room;

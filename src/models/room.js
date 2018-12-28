const room = (sequelize, DataTypes) => {
  const Room = sequelize.define('room', {
    text: DataTypes.STRING
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

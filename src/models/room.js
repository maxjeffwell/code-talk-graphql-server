const room = (sequelize, DataTypes) => {
  const Room = sequelize.define('room', {
    title: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    }
  });

  Room.associate = (models) => {
    Room.hasMany(models.Message);
  };

  return Room;
};

export default room;

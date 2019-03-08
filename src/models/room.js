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
    roomId : {
      type: DataTypes.INTEGER,
      field: 'roomId'
    },
  });

  Room.associate = (models) => {
    Room.hasMany(models.Message);
  };

  return Room;
};

export default room;

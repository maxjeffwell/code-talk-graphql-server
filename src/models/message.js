export default (sequelize, DataTypes) => {
const Message = sequelize.define('message', { // creates message table
  text: {
    type: DataTypes.STRING,
    underscored: true
  },
});

Message.associate = (models) => {
  Message.belongsTo(models.User, {
    foreignKey: {
      name: 'userId',
      field: 'user_id',
      allowNull: false
    },
  });
};

return Message;

};

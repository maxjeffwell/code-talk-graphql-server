const Sequelize = require('sequelize');
const { sequelize } = require('../db/sequelize');

const Message = sequelize.define('message', { // creates message table
  text: {
    type: Sequelize.STRING,
    underscored: true
  },
}, {
  classMethods: {
    associate: function (models) {
      Message.belongsTo(models.User, {
        foreignKey: {
          name: 'userId',
          field: 'user_id'
        }
      });
    }
  }
});

module.exports = {
  Message
};

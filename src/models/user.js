const Sequelize = require('sequelize');
const { sequelize } = require('../db/sequelize');

const User = sequelize.define('user', { // creates user table
  username: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  },
  email: {
    type: Sequelize.STRING,
    unique: true
  },
  password: {
    type: Sequelize.STRING
  },
}, {
  classMethods: {
    associate: function (models) {
      User.hasMany(
        models.Message,
        {
          foreignKey: {
            allowNull: false
          }
        });
    }
  }
});

module.exports = {
  User
};


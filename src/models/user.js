export default (sequelize, DataTypes) => {
  const User = sequelize.define('user', { // creates user table
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isAlphanumeric: {
          args: true,
          msg: 'User names must consist of letters and numbers only'
        },
        len: {
          args: [4, 15],
          msg: 'User names must be between 4 and 15 characters long'
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        isEmail: {
          args: true,
          msg: 'Invalid email address'
        },
      },
    },
    password: {
      type: DataTypes.STRING
    },
  });

User.associate = (models) => {
  User.hasMany(models.Message, {
    foreignKey: {
      allowNull: false
    },
  });
};

return User;

};



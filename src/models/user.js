import bcryptjs from 'bcryptjs';

const user = (sequelize, DataTypes) => {
  const User = sequelize.define('user', {
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      trim: true,
      validate: {
        isAlphanumeric: {
          notEmpty: true,
          args: true,
          msg: 'Your username can only contain letters and numbers',
        },
        len: {
          args: [3, 25],
          msg: 'Your username must be between 3 and 25 characters long',
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      trim: true,
      lowercase: true,
      validate: {
        notEmpty: true,
        isEmail: {
          args: true,
          msg: 'You entered an invalid email address',
        },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: {
          args: [7, 42],
          msg: 'Your password must be between 7 and 42 characters long',
        },
      },
    },
    role: {
      type: DataTypes.ENUM('USER', 'ADMIN'),
      defaultValue: 'USER',
      allowNull: false,
    },
  });

  User.associate = (models) => {
    User.hasMany(models.Message, {
      onDelete: 'CASCADE',
    });
    User.belongsToMany(models.Room, {
      through: 'user_rooms',
      foreignKey: 'userId',
      otherKey: 'roomId',
    });
  };

  User.findByLogin = async (login) => {
    let found = await User.findOne({
      where: { username: login },
    });

    if (!found) {
      found = await User.findOne({
        where: { email: login },
      });
    }

    return found;
  };

  User.beforeCreate(async (instance) => {
    instance.password = await instance.generatePasswordHash();
  });

  User.prototype.generatePasswordHash = async function () {
    const saltRounds = 10;
    return bcryptjs.hash(this.password, saltRounds);
  };

  User.prototype.validatePassword = async function (password) {
    return bcryptjs.compare(password, this.password);
  };

  return User;
};

export default user;

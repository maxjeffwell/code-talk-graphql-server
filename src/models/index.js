import { Sequelize } from 'sequelize';
import User from './user.js';
import Message from './message.js';
// import Room from './room.js';

const sequelize = new Sequelize(
  process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
  {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

const models = {
  User: User(sequelize, Sequelize.DataTypes),
  Message: Message(sequelize, Sequelize.DataTypes),
  // Room: Room(sequelize, Sequelize.DataTypes),
};

Object.keys(models).forEach(key => {
  if ('associate' in models[key]) {
    models[key].associate(models);
  }
});

export { sequelize };

export default models;

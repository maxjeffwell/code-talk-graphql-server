import { Sequelize } from 'sequelize';
import { database } from '../config/index.js';
import User from './user.js';
import Message from './message.js';
// import Room from './room.js';

const sequelize = new Sequelize(
  database.url || database.testUrl,
  database.options
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

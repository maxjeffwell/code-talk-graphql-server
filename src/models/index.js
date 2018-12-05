import Sequelize from 'sequelize';

const { DATABASE_URL, SEQUELIZE_OPTIONS }  = require('../config');

console.log(`Connecting to database at ${DATABASE_URL}`);

const sequelize = new Sequelize(DATABASE_URL, SEQUELIZE_OPTIONS);

const models = {
  User: sequelize.import('./user'),
  Message: sequelize.import('./message')
};

Object.keys(models).forEach((modelName) => {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

export default models;


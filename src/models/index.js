const { User } = require('./user');
const { Message } = require('./message');

const models = {
  User,
  Message
}

Object.keys(models).forEach((modelName) => {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models);
  }
});

module.exports =  models;


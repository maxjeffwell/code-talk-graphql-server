require('dotenv').config();

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI,
  TEST_MONGODB_URI: process.env.TEST_MONGODB_URI,
  CLIENT_ORIGIN: process.env.NODE_ENV || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d'
};

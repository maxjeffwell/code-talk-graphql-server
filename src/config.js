import dotenv from 'dotenv';
dotenv.config({ silent: true });

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  SEQUELIZE_OPTIONS: {
    logging: process.env.NODE_ENV === 'test' ? false : console.log
  },
  DB_USERNAME: process.env.DB_USERNAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  CLIENT_ORIGIN: process.env.NODE_ENV || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d'
};

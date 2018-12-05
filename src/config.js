require('dotenv').config();

module.exports = {
	DATABASE_URL: process.env.DATABASE_URL,
	JWT_SECRET: process.env.JWT_SECRET,
	JWT_SECRET2: process.env.JWT_SECRET2
};

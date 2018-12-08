import Sequelize from 'sequelize';
const { DATABASE_URL } = require('../config');

const sequelize = new Sequelize(DATABASE_URL, {
	dialect: 'postgres',
	operatorsAliases: Sequelize.Op,
	define: {
		underscored: true,
	},
});

const models = {
	User: sequelize.import('./user'),
	Channel: sequelize.import('./channel'),
	Message: sequelize.import('./message'),
	Team: sequelize.import('./team'),
	Member: sequelize.import('./member'),
	DirectMessage: sequelize.import('./directMessage'),
	PCMember: sequelize.import('./pcmember')
};

Object.keys(models).forEach((modelName) => {
	if ('associate' in models[modelName]) {
		models[modelName].associate(models);
	}
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

export default models;


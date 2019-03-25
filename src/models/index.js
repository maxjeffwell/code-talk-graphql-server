import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
	process.env.DATABASE_URL || process.env.TEST_DATABASE_URL, {
	dialect: 'postgres',
	operatorsAliases: false,
});

const models = {
	User: sequelize.import('./user'),
	Message: sequelize.import('./message'),
	Uploads: sequelize.import('./uploads'),
};

Object.keys(models).forEach(key => {
	if ('associate' in models[key]) {
		models[key].associate(models);
	}
});

export { sequelize };

export default models;


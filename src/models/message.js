export default (sequelize, DataTypes) => {
	const Message = sequelize.define('message', {
		text: DataTypes.STRING,
		validate: {
			notEmpty: true
		},
	});

	Message.associate = (models) => {
		Message.belongsTo(models.User);
	};

	return Message;
};

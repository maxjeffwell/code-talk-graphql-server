const message = (sequelize, DataTypes) => {
	const Message = sequelize.define('message', {
		text: {
			type: DataTypes.STRING,
			validate: {
				notEmpty: true
			},
		},
	});

	Message.associate = (models) => {
		Message.belongsTo(models.User);
	};

	Message.associate = (models) => {
		Message.belongsTo(models.Room);
	};

	return Message;
};

export default message;

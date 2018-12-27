const message = (sequelize, DataTypes) => {
	const Message = sequelize.define('message', {
		text: DataTypes.STRING
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

const message = (sequelize, DataTypes) => {
	const Message = sequelize.define('message', {
		id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			field: 'id',
			primaryKey: true,
			autoIncrement: true,
		},
		text: {
			type: DataTypes.STRING,
			validate: {
				notEmpty: true,
			},
		},
		roomId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			foreignKey: true,
			field: 'roomId',
		},
		userId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			foreignKey: true,
			field: 'userId',
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

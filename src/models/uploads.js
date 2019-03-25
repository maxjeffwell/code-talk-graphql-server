const uploads = (sequelize, DataTypes) => {
	const Uploads = sequelize.define('uploads', {
		filename: {
			type: DataTypes.STRING,
		},
		mimetype: {
			type: DataTypes.STRING,
		},
		path: {
			type: DataTypes.STRING,
		}
		},
	);

	Uploads.associate = (models) => {
		Uploads.belongsTo(models.User, {
			foreignKey: {
				name: 'userId',
				field: 'userId',
			},
		});
	};

	return Uploads;
};

export default uploads;
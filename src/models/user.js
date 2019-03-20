import bcrypt from 'bcryptjs';

const user = (sequelize, DataTypes) => {
	const User = sequelize.define('user', {
		username: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: false,
			validate: {
				isAlphanumeric: {
					notEmpty: true,
					args: true,
					msg: 'Your username can only contain letters and numbers'
				},
				len: {
					args: [3, 25],
					msg: 'Your username must be between 3 and 25 characters long'
				},
			},
		},
		email: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: false,
			validate: {
				notEmpty: true,
				isEmail: {
					args: true,
					msg: 'You entered an invalid email address'
				},
			},
		},
		password: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				notEmpty: true,
				len: {
					args: [7, 42],
					msg: 'Your password must be between 7 and 42 characters long'
				},
			},
		},
	});

	User.associate = (models) => {
		User.hasMany(models.Message,
			{
				onDelete: 'CASCADE'
			});
	};

	User.findByLogin = async login => {
		let user = await User.findOne({
			where: { username: login },
		});

		if (!user) {
			user = await User.findOne({
				where: { email: login },
			});
		}

		return user;
	};

	User.beforeCreate(async user => {
		user.password = await user.generatePasswordHash();
	});

	User.prototype.generatePasswordHash = async function() {
		const saltRounds = 10;
		return await bcrypt.hash(this.password, saltRounds);
	};

	User.prototype.validatePassword = async function(password) {
		return await bcrypt.compare(password, this.password);
	};

	return User;
};

export default user;



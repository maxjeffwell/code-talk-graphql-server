import bcrypt from 'bcryptjs';

export default (sequelize, DataTypes) => {
	const User = sequelize.define(
		'user',
		{
			username: {
				type: DataTypes.STRING,
				unique: true,
				allowNull: false,
				validate: {
					isAlphanumeric: {
						notEmpty: true,
						args: true,
						msg: 'The username can only contain letters and numbers',
					},
					len: {
						args: [3, 25],
						msg: 'Your username must be between 3 and 25 characters long',
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
						msg: 'Invalid email',
					},
				},
			},
			password: {
				type: DataTypes.STRING,
				allowNull: false,
				validate: {
					notEmpty: true,
					len: {
						args: [3, 75],
						msg: 'Your password needs to be between 3 and 72 characters long',
					},
				},
			},
			role: {
				type: DataTypes.STRING
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
			const saltRounds = 12;
			return await bcrypt.hash(this.password, saltRounds);
		};

		User.prototype.validatePassword = async password => {
			return await bcrypt.compare(password, this.password);
		};

		return User;
};



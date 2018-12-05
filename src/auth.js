import jwt from 'jsonwebtoken';
import _ from 'lodash';
import bcrypt from 'bcryptjs';

export const createTokens = async (user, JWT_SECRET, JWT_SECRET2) => {
	const createToken = jwt.sign(
		{
			user: _.pick(user, ['id', 'username']),
		},
		JWT_SECRET,
		{
			expiresIn: '1h',
		},
	);

	const createRefreshToken = jwt.sign(
		{
			user: _.pick(user, 'id'),
		},
		JWT_SECRET2,
		{
			expiresIn: '7d',
		},
	);

	return [createToken, createRefreshToken];
};

export const refreshTokens = async (token, refreshToken, models, JWT_SECRET, JWT_SECRET2) => {
	let userId = 0;
	try {
		const { user: { id } } = jwt.decode(refreshToken);
		userId = id;
	} catch (err) {
		return {};
	}

	if (!userId) {
		return {};
	}

	const user = await models.User.findOne({ where: { id: userId }, raw: true });

	if (!user) {
		return {};
	}

	const refreshSecret = user.password + JWT_SECRET2;

	try {
		jwt.verify(refreshToken, refreshSecret);
	} catch (err) {
		return {};
	}

	const [newToken, newRefreshToken] = await createTokens(user, JWT_SECRET, refreshSecret);
	return {
		token: newToken,
		refreshToken: newRefreshToken,
		user,
	};
};

export const tryLogin = async (email, password, models, JWT_SECRET, JWT_SECRET2) => {
	const user = await models.User.findOne({ where: { email }, raw: true });
	if (!user) {
		// user with provided email not found
		return {
			ok: false,
			errors: [{ path: 'email', message: 'Invalid credentials' }],
		};
	}

	const valid = await bcrypt.compare(password, user.password);
	if (!valid) {
		return {
			ok: false,
			errors: [{ path: 'password', message: 'Invalid credentials' }],
		};
	}

	const refreshTokenSecret = user.password + JWT_SECRET2;

	const [token, refreshToken] = await createTokens(user, JWT_SECRET, refreshTokenSecret);

	return {
		ok: true,
		token,
		refreshToken,
	};
};

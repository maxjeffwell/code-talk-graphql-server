import { expect } from 'chai';

import * as userApi from './api';

describe('users', () => {
	describe('user(id: String!): User', () => {
		it('returns a user when user can be found', async () => {
			const expectedResult = {
				data: {
					user: {
						id: '1',
						username: 'jeff',
						email: 'jeff@test.example',
						role: 'ADMIN',
					},
				},
			};

			const result = await userApi.user({ id: '1' });

			expect(result.data).to.eql(expectedResult);
		});

		it('returns null when user cannot be found', async () => {
			const expectedResult = {
				data: {
					user: null,
				},
			};

			const result = await userApi.user({ id: '42' });

			expect(result.data).to.eql(expectedResult);
		});
	});

	describe('users: [User!]', () => {
		it('returns a list of users', async () => {
			const expectedResult = {
				data: {
					users: [
						{
							id: '1',
							username: 'jeff',
							email: 'jeff@test.example',
							role: 'ADMIN',
						},
						{
							id: '2',
							username: 'jeff2',
							email: 'jeff2@test.example',
							role: null,
						},
					],
				},
			};

			const result = await userApi.users();

			expect(result.data).to.eql(expectedResult);
		});
	});

	describe('me: User', () => {
		it('returns null when no user is signed in', async () => {
			const expectedResult = {
				data: {
					me: null,
				},
			};

			const { data } = await userApi.me();

			expect(data).to.eql(expectedResult);
		});

		it('returns me when me is signed in', async () => {
			const expectedResult = {
				data: {
					me: {
						id: '1',
						username: 'jeff',
						email: 'jeff@test.example',
					},
				},
			};

			const {
				data: {
					data: {
						signIn: { token },
					},
				},
			} = await userApi.signIn({
				login: 'jeff',
				password: 'username5',
			});

			const { data } = await userApi.me(token);

			expect(data).to.eql(expectedResult);
		});
	});

	describe('signUp, updateUser, deleteUser', () => {
		it('signs up a user, updates a user and deletes the user as admin', async () => {
			// sign up

			let {
				data: {
					data: {
						signUp: { token },
					},
				},
			} = await userApi.signUp({
				username: 'jeff',
				email: 'jeff@test.example',
				password: 'username5',
			});

			const {
				data: {
					data: { me },
				},
			} = await userApi.me(token);

			expect(me).to.eql({
				id: '1',
				username: 'jeff',
				email: 'jeff@test.example',
			});


			const {
				data: {
					data: { updateUser },
				},
			} = await userApi.updateUser({ username: 'jeff' }, token);

			expect(updateUser.username).to.eql('jeff');

			// delete as admin

			const {
				data: {
					data: {
						signIn: { token: adminToken },
					},
				},
			} = await userApi.signIn({
				login: 'jeff',
				password: 'username5',
			});

			const {
				data: {
					data: { deleteUser },
				},
			} = await userApi.deleteUser({ id: me.id }, adminToken);

			expect(deleteUser).to.eql(true);
		});
	});

	describe('deleteUser(id: String!): Boolean!', () => {
		it('returns an error because only admins can delete a user', async () => {
			const {
				data: {
					data: {
						signIn: { token },
					},
				},
			} = await userApi.signIn({
				login: 'Ron',
				password: 'unknown',
			});

			const {
				data: { errors },
			} = await userApi.deleteUser({ id: '1' }, token);

			expect(errors[0].message).to.eql('Unauthorized');
		});
	});

	describe('updateUser(username: String!): User!', () => {
		it('returns an error because only authenticated users can update a user', async () => {
			const {
				data: { errors },
			} = await userApi.updateUser({ username: 'Hermione' });

			expect(errors[0].message).to.eql('Not authenticated');
		});
	});

	describe('signIn(login: String!, password: String!): Token!', () => {
		it('returns a token when a user signs in with username', async () => {
			const {
				data: {
					data: {
						signIn: { token },
					},
				},
			} = await userApi.signIn({
				login: 'jeff',
				password: 'username5',
			});

			expect(token).to.be.a('string');
		});

		it('returns a token when a user signs in with email', async () => {
			const {
				data: {
					data: {
						signIn: { token },
					},
				},
			} = await userApi.signIn({
				login: 'jeff@test.example',
				password: 'username5',
			});

			expect(token).to.be.a('string');
		});

		it('returns an error when a user provides a wrong password', async () => {
			const {
				data: { errors },
			} = await userApi.signIn({
				login: 'jeff',
				password: 'unknown',
			});

			expect(errors[0].message).to.eql('Invalid credentials');
		});
	});

	it('returns an error when a user is not found', async () => {
		const {
			data: { errors },
		} = await userApi.signIn({
			login: 'unknown',
			password: 'unknown',
		});

		expect(errors[0].message).to.eql(
			'Login credentials not found',
		);
	});
});

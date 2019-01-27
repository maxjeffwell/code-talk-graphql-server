import { expect } from 'chai';
import * as api from './api';

describe('users', () => {
	describe('user(id: String!): User', () => {
		it('returns a user when a user can be found', async () => {
			const expectedResult = {
				data: {
					user: {
						id: '1',
						username: 'jeff',
						email: 'jeff@test.example',
						role: null,
					},
				},
			};

			const result = await api.user({ id: '1' });

			expect(result.data).to.eql(expectedResult);
		});

		it('returns null when user cannot be found', async () => {
			const expectedResult = {
				data: {
					user: null,
				},
			};

			const result = await api.user({ id: '42' });

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
							role: null,
						},
						{
							id: '2',
							username: 'jeff2',
							email: 'jeff2@test.example',
							role: null,
						},
						{
							id: '3',
							username: 'jeff3',
							email: 'jeff3@test.example',
							role: null,
						},
						{
							id: '4',
							username: 'jeff4',
							email: 'jeff4@test.example',
							role: null,
						},
						{
							id: '7',
							username: 'jeff6',
							email: 'jeff6@test.example',
							role: null,
						},
						{
							id: '8',
							username: 'jeff7',
							email: 'jeff7@test.example',
							role: null,
						},
						{
							id: '9',
							username: 'jeff8',
							email: 'jeff8@test.example',
							role: null,
						},
						{
							id: '10',
							username: 'jeff10',
							email: 'jeff10@test.example',
							role: null,
						},
						{
							id: '20',
							username: 'jeff50',
							email: 'jeff50@test.example',
							role: 'ADMIN',
						},
						{
							id: '21',
							username: 'jeff51',
							email: 'jeff51@test.example',
							role: null,
						},
					],
				},
			};

			const result = await api.users();

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

			const { data } = await api.me();

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
			} = await api.signIn({
				login: 'jeff',
				password: 'username5',
			});

			const { data } = await api.me(token);

			expect(data).to.eql(expectedResult);
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
			} = await api.signIn({
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
			} = await api.signIn({
				login: 'jeff@test.example',
				password: 'username5',
			});

			expect(token).to.be.a('string');
		});

		it('returns an error when a user provides a wrong password', async () => {
			const {
				data: { errors },
			} = await api.signIn({
				login: 'jeff',
				password: 'unknown',
			});

			expect(errors[0].message).to.eql('Invalid credentials');
		});
	});

	it('returns an error when a user is not found', async () => {
		const {
			data: { errors },
		} = await api.signIn({
			login: 'unknown',
			password: 'unknown',
		});

		expect(errors[0].message).to.eql(
			'Invalid credentials',
		);
	});
});

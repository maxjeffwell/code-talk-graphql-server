import { expect } from 'chai';
import * as api from './api';

describe('Messages', () => {
	describe('messages (limit: INT)', () => {
		it('returns a list of messages', async () => {
			const expectedResult = {
				data: {
					messages: {
						edges: [
							{
								text: 'hello360',
							},
							{
								text: 'hello361',
							},
						],
					},
				},
			};

			const result = await api.messages();

			expect(result.data).to.eql(expectedResult);
		});

		it('should get messages with the users', async () => {
			const expectedResult = {
				data: {
					messages: {
						edges: [
							{
								text: 'hello360',
								user: {
									username: 'jeff',
								},
							},
							{
								text: 'hello361',
								user: {
									username: 'jeff',
								},
							},
						],
					},
				},
			};

			const result = await api.messagesInclUsers();

			expect(result.data).to.eql(expectedResult);
		});
	});
});

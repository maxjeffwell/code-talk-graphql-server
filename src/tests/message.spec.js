import { expect } from 'chai';
import * as api from './api';

describe('Messages', () => {
  // Sign in before running message tests (messages require auth)
  beforeEach(async () => {
    api.clearCookies();
    await api.signIn({
      login: 'jeff',
      password: 'username5',
    });
  });

  describe('messages(limit: Int, cursor: String)', () => {
    it('returns a list of messages', async () => {
      const result = await api.messages({ limit: 2 });

      expect(result.data.data.messages).to.have.property('edges');
      expect(result.data.data.messages.edges).to.be.an('array');
      expect(result.data.data.messages).to.have.property('pageInfo');
    });

    it('returns messages with user information', async () => {
      const result = await api.messages({ limit: 2 });

      const messages = result.data.data.messages.edges;
      if (messages.length > 0) {
        expect(messages[0]).to.have.property('text');
        expect(messages[0]).to.have.property('user');
        expect(messages[0].user).to.have.property('username');
      }
    });

    it('supports pagination with cursor', async () => {
      const firstPage = await api.messages({ limit: 1 });

      expect(firstPage.data.data.messages.pageInfo).to.have.property('endCursor');
      expect(firstPage.data.data.messages.pageInfo).to.have.property('hasNextPage');
    });
  });

  describe('createMessage(text: String!)', () => {
    it('creates a new message', async () => {
      const result = await api.createMessage({ text: 'Test message from spec' });

      expect(result.data.data.createMessage).to.have.property('id');
      expect(result.data.data.createMessage.text).to.equal('Test message from spec');
      expect(result.data.data.createMessage.user).to.have.property('username');
    });

    it('returns error when not authenticated', async () => {
      api.clearCookies(); // Clear auth

      const result = await api.createMessage({ text: 'Should fail' });

      expect(result.data.errors).to.be.an('array');
    });
  });

  describe('deleteMessage(id: ID!)', () => {
    it('deletes a message owned by user', async () => {
      // First create a message
      const createResult = await api.createMessage({ text: 'Message to delete' });
      const messageId = createResult.data.data.createMessage.id;

      // Then delete it
      const deleteResult = await api.deleteMessage({ id: messageId });

      expect(deleteResult.data.data.deleteMessage).to.be.true;
    });
  });
});

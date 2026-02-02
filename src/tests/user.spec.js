import { expect } from 'chai';
import * as api from './api';

describe('users', () => {
  // Clear cookies before each test to ensure clean state
  beforeEach(() => {
    api.clearCookies();
  });

  describe('user(id: String!): User', () => {
    it('returns a user when a user can be found', async () => {
      // First sign in to get authenticated
      await api.signIn({
        login: 'jeff',
        password: 'username5',
      });

      const result = await api.user({ id: '1' });

      expect(result.data.data.user).to.include({
        id: '1',
        username: 'jeff',
        email: 'jeff@test.example',
      });
    });

    it('returns null when user cannot be found', async () => {
      // Sign in first
      await api.signIn({
        login: 'jeff',
        password: 'username5',
      });

      const result = await api.user({ id: '42' });

      expect(result.data.data.user).to.be.null;
    });
  });

  describe('users: [User!]', () => {
    it('returns a list of users', async () => {
      // Sign in first (users query requires authentication)
      await api.signIn({
        login: 'jeff',
        password: 'username5',
      });

      const result = await api.users();

      expect(result.data.data.users).to.be.an('array');
      expect(result.data.data.users.length).to.be.greaterThan(0);
      expect(result.data.data.users[0]).to.have.property('username');
      expect(result.data.data.users[0]).to.have.property('email');
    });
  });

  describe('me: User', () => {
    it('returns null when no user is signed in', async () => {
      api.clearCookies(); // Ensure no cookies

      const result = await api.me();

      expect(result.data.data.me).to.be.null;
    });

    it('returns me when signed in', async () => {
      // Sign in first
      const signInResult = await api.signIn({
        login: 'jeff',
        password: 'username5',
      });

      // Verify sign in was successful
      expect(signInResult.data.data.signIn.success).to.be.true;

      // Now check me query (uses cookies automatically)
      const result = await api.me();

      expect(result.data.data.me).to.include({
        username: 'jeff',
        email: 'jeff@test.example',
      });
    });
  });

  describe('signIn(login: String!, password: String!): AuthPayload!', () => {
    it('returns success and user when signing in with username', async () => {
      const result = await api.signIn({
        login: 'jeff',
        password: 'username5',
      });

      expect(result.data.data.signIn.success).to.be.true;
      expect(result.data.data.signIn.user).to.include({
        username: 'jeff',
        email: 'jeff@test.example',
      });
    });

    it('returns success and user when signing in with email', async () => {
      const result = await api.signIn({
        login: 'jeff@test.example',
        password: 'username5',
      });

      expect(result.data.data.signIn.success).to.be.true;
      expect(result.data.data.signIn.user).to.include({
        username: 'jeff',
      });
    });

    it('returns an error when providing wrong password', async () => {
      const result = await api.signIn({
        login: 'jeff',
        password: 'wrongpassword',
      });

      expect(result.data.errors).to.be.an('array');
      expect(result.data.errors[0].message).to.include('Invalid credentials');
    });

    it('returns an error when user is not found', async () => {
      const result = await api.signIn({
        login: 'nonexistentuser',
        password: 'anypassword',
      });

      expect(result.data.errors).to.be.an('array');
      expect(result.data.errors[0].message).to.include('Invalid credentials');
    });
  });

  describe('signOut: Boolean!', () => {
    it('returns true when signing out', async () => {
      // Sign in first
      await api.signIn({
        login: 'jeff',
        password: 'username5',
      });

      // Sign out
      const result = await api.signOut();

      expect(result.data.data.signOut).to.be.true;

      // Verify me returns null after sign out
      const meResult = await api.me();
      expect(meResult.data.data.me).to.be.null;
    });
  });
});

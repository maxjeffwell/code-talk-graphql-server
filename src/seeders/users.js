import models from '../models/index.js';

export const seedUsers = async () => {
  const users = [
    // Test user expected by integration tests
    {
      username: 'jeff',
      email: 'jeff@test.example',
      password: 'username5',
      role: 'USER',
    },
    {
      username: 'demo',
      email: 'demo@example.com',
      password: 'demopassword',
      role: 'USER',
    },
    {
      username: 'demo2',
      email: 'demo2@example.com',
      password: 'demopassword',
      role: 'USER',
    },
    {
      username: 'admin',
      email: 'admin@example.com',
      password: 'adminpassword',
      role: 'ADMIN',
    },
    {
      username: 'alice',
      email: 'alice@example.com',
      password: 'alicepassword',
      role: 'USER',
    },
    {
      username: 'bob',
      email: 'bob@example.com',
      password: 'bobpassword',
      role: 'USER',
    },
    {
      username: 'charlie',
      email: 'charlie@example.com',
      password: 'charliepassword',
      role: 'USER',
    },
    {
      username: 'diana',
      email: 'diana@example.com',
      password: 'dianapassword',
      role: 'USER',
    },
    {
      username: 'eve',
      email: 'eve@example.com',
      password: 'evepassword',
      role: 'USER',
    },
  ];

  try {
    const createdUsers = await models.User.bulkCreate(users, {
      returning: true,
      individualHooks: true, // This ensures password hashing hooks run
    });
    
    console.log('📄 Created users:', createdUsers.map(u => u.username).join(', '));
    return createdUsers;
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};
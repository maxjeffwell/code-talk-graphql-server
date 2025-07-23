import { sequelize } from '../models';
import models from '../models';

const seedRooms = async () => {
  try {
    console.log('Starting room seeding...');
    
    // Find existing users
    const users = await models.User.findAll({ limit: 3 });
    
    if (users.length < 2) {
      console.error('Need at least 2 users to seed rooms. Run seed-database.js first.');
      process.exit(1);
    }
    
    // Create rooms
    const rooms = await Promise.all([
      models.Room.create({ title: 'General Discussion' }),
      models.Room.create({ title: 'JavaScript Help' }),
      models.Room.create({ title: 'React Development' }),
      models.Room.create({ title: 'Node.js Backend' }),
    ]);
    
    console.log(`Created ${rooms.length} rooms`);
    
    // Add users to rooms
    await Promise.all([
      rooms[0].addUsers(users), // Add all users to General Discussion
      rooms[1].addUsers([users[0], users[1]]), // Add first two users to JavaScript Help
      rooms[2].addUser(users[0]), // Add first user to React Development
      rooms[3].addUsers(users.slice(0, 2)), // Add first two users to Node.js Backend
    ]);
    
    console.log('Added users to rooms');
    
    // Create some messages in rooms
    const messages = await Promise.all([
      models.Message.create({
        text: 'Welcome to General Discussion!',
        userId: users[0].id,
        roomId: rooms[0].id,
      }),
      models.Message.create({
        text: 'Anyone need help with JavaScript?',
        userId: users[1].id,
        roomId: rooms[1].id,
      }),
      models.Message.create({
        text: 'React 18 is awesome!',
        userId: users[0].id,
        roomId: rooms[2].id,
      }),
      models.Message.create({
        text: 'Express or Fastify for REST APIs?',
        userId: users[1].id,
        roomId: rooms[3].id,
      }),
    ]);
    
    console.log(`Created ${messages.length} messages in rooms`);
    console.log('Room seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding rooms:', error);
  } finally {
    await sequelize.close();
  }
};

seedRooms();
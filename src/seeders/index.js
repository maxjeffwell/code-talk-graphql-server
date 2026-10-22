import { sequelize } from '../models/index.js';
import { seedUsers } from './users.js';
import { seedMessages } from './messages.js';

const isDrop = process.argv.includes('--drop');
const isForce = process.argv.includes('--force');

const createDatabase = async () => {
  try {
    if (isDrop) {
      console.log('🗑️  Dropping database...');
      await sequelize.drop();
      console.log('✅ Database dropped successfully');
    }

    console.log('🔄 Syncing database...');
    await sequelize.sync({ force: isForce });
    console.log('✅ Database synced successfully');

    console.log('🌱 Starting database seeding...');

    // Seed users first (messages depend on users)
    const users = await seedUsers();
    console.log(`✅ Seeded ${users.length} users`);

    // Seed messages
    const messages = await seedMessages(users);
    console.log(`✅ Seeded ${messages.length} messages`);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

const seed = async () => {
  await createDatabase();
  await sequelize.close();
};

seed();

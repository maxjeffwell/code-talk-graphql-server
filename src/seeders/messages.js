import models from '../models/index.js';

export const seedMessages = async (users) => {
  const sampleMessages = [
    'Hello everyone! 👋',
    'Welcome to Code Talk!',
    'How is everyone doing today?',
    'I just finished working on a new feature',
    'Anyone up for a code review?',
    'Let\'s discuss the latest GraphQL updates',
    'Has anyone tried the new Apollo Server features?',
    'Great work on the authentication system!',
    'The real-time messaging is working perfectly',
    'Love the WebSocket implementation',
    'Time for a quick standup?',
    'Don\'t forget to write tests!',
    'Code quality is looking good',
    'The database performance is impressive',
    'Let\'s pair program later',
    'Thanks for the helpful feedback',
    'The UI updates look amazing',
    'Security review went well',
    'Ready for the next sprint',
    'Coffee break? ☕',
    'Just deployed the latest changes',
    'The subscription system is solid',
    'Great job on the bug fixes',
    'Documentation is up to date',
    'Looking forward to the demo',
  ];

  if (!users || users.length === 0) {
    throw new Error('No users available for seeding messages');
  }

  try {
    const messages = [];
    
    // Create messages with random users and timestamps
    for (let i = 0; i < sampleMessages.length; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomDate = new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000 // Within last 7 days
      );
      
      messages.push({
        text: sampleMessages[i],
        userId: randomUser.id,
        createdAt: randomDate,
        updatedAt: randomDate,
      });
    }

    // Sort messages by creation date for realistic conversation flow
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const createdMessages = await models.Message.bulkCreate(messages, {
      returning: true,
    });

    console.log('💬 Created messages with sample conversation');
    return createdMessages;
  } catch (error) {
    console.error('❌ Error seeding messages:', error);
    throw error;
  }
};
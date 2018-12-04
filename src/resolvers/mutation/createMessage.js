const { Message } = require('../../models/message');
const { User } = require('../../models/user');

export default {
  Mutation: {
    createMessage: (async (parent, args, {pubsub}) => {
      try {
        const dbMessage = await Message.create({
          ...args,
          userId: User.id
        });

        const asyncFunc = async () => {
          const currentUser = await User.findOne({
            where: {
              id: User.id
            },
          });

          pubsub.publish('PUBSUB_NEW_MESSAGE', {
            newMessage: dbMessage,
            user: currentUser
          });
        };

        asyncFunc();

        return true;
      } catch (err) {
        console.log(err);
        return false;
      }
    }),
  },
};

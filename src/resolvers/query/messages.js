const { Message } = require('../../models/message');
const { User } = require('../../models/user');

module.exports = async(root, args, context) => {
  const decodedToken = context.isAuthorized();
  const isUser = await User.findByPk(decodedToken.user.id);
  if (isUser) {
    return await Message.findAll(
      { order: [['createdAt', 'ASC']] }
    );
  } else {
    throw('Unauthorized');
  }
}



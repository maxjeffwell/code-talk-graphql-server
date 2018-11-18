const otherUsers = require('../../models/otherUsers');
const User = require('../../models/user');

module.exports = async (root, args, context) => {
  const decodedToken = context.isAuthorized();
  const isUser = await User.findById(decodedToken.user._id);
  if(isUser) {
    return await otherUsers.find();
  } else {
    throw('Unauthorized');
  }
}





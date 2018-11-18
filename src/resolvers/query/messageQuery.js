const messageQuery = require('../../models/message')
const User = require('../../models/user')

module.exports = async(root, args, context) => {
  const decodedToken = context.isAuthorized();
  const isUser = await User.findById(decodedToken.user._id);
  if(isUser) {
    return await messageQuery.find();
  } else {
    throw('Unauthorized');
  }
}

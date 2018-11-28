const CurrentUser = require('../../models/currentUser');

module.exports = async (parent, args, context) => {
  const decodedToken = context.isAuthorized();
  let currentUser = decodedToken.user;

  console.log(currentUser.username);

  return await CurrentUser.findOne(currentUser);
}



const CurrentUser = require('../../models/currentUser');

module.exports = (parent, args, context) => {
  localStorage.removeItem('AUTH_TOKEN');
  return { message: 'Goodbye' };
}

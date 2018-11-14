const User = require('../../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {JWT_SECRET} = require('../../config');

module.exports = async (root, args) => {
  const hashedPassword = await bcrypt.hash(args.password, 10);
  const user = await User.create({username: args.username, email: args.email, password: hashedPassword});
  return jwt.sign({user}, JWT_SECRET);
}

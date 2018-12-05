const { User } = require('../../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {JWT_SECRET} = require('../../config');

export default {
  Mutation: {
    login: async (parent, {email, password}, context) => {
      const user = await User.findOne({where: {email}});
      if (!user) {
        throw new Error("Invalid credentials");
      }
      const isAllowed = await bcrypt.compare(password, user.password);
      if (!isAllowed) {
        throw new Error("Invalid credentials");
      }
      return jwt.sign({user}, JWT_SECRET);
    }
  }
};

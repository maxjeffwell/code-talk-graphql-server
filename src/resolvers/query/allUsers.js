const { User } = require('../../models/user');

export default {
  Query: {
    allUsers: async (parent, args, context) => {
      return await User.findAll();
    }
  }
};

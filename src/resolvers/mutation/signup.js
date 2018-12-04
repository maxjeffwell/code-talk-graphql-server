const { User } = require('../../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {JWT_SECRET} = require('../../config');
const _ = require('lodash');

const formatErrors = (e) => {
  if (e instanceof sequelize.ValidationError) {
    return e.errors.map(x => _.pick(x, ['path', 'message']));
  }
  return [{ path: 'name', message: `Something didn't work quite right that time` }];
};

export default {
  Mutation: {
    signup: async (parent, args, context) => {
      try {
        if (args.password.length < 5) {
          return {
            ok: false,
            errors: [
              {
                path: 'password',
                message: 'Passwords must be at least 5 characters long'
              },
            ],
          };
        }
        const hashedPassword = await bcrypt.hash(args.password, 10);
        const user = await User.create({username: args.username, email: args.email, password: hashedPassword});
        jwt.sign({user}, JWT_SECRET);
        return {
          ok: true,
          user,
        };
      } catch (e) {
        return {
          ok: false,
          errors: formatErrors(e)
        };
      }
    },
  },
};

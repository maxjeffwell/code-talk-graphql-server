const { GraphQLServer, PubSub } = require('graphql-yoga');
const { sequelize } = require('./db/sequelize')
const typeDefs='./src/schema.graphql';
const Query = require('./resolvers/query');
const Mutation = require('./resolvers/mutation');
const Subscription = require('./resolvers/subscription');
const Date = require('./resolvers/date');

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');

dotenv = require('dotenv');

dotenv.load();

const resolvers = {
  Query,
  Mutation,
  Subscription,
  Date
}
const pubsub = new PubSub();
const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: incomingData => ({
    incomingData,
    pubsub,
    isAuthorized: () => {
      const AuthHeader = incomingData.request.header('authorization');
      if(!AuthHeader){
        throw('Unauthorized');
      }
      const token = AuthHeader.replace('Bearer ', '');
      const decodedToken = jwt.verify(token, JWT_SECRET);
      return decodedToken;
    }
  })
})

  sequelize.sync().then(function () {
  server.start(() => console.log(`Server is running`));
});


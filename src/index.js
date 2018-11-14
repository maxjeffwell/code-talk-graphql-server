const { GraphQLServer, PubSub } = require('graphql-yoga');
const mongoose = require('mongoose');
const typeDefs='./src/schema.graphql';
const Query = require('./resolvers/query');
const Mutation = require('./resolvers/mutation');
const Subscription = require('./resolvers/subscription');
const Date = require('./resolvers/date');
const jwt = require('jsonwebtoken');
const {JWT_SECRET, MONGODB_URI} = require('./config');
const dotenv = require('dotenv');

dotenv.load();

const resolvers= {
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

if (require.main === module) {
  mongoose.Promise = global.Promise;
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/code-talk', {
    useNewUrlParser: true
  });
  mongoose.set('useCreateIndex', true);;
  server.start(() => console.log(`Server is running`));
}

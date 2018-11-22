const { GraphQLServer, PubSub } = require('graphql-yoga');
const mongoose = require('mongoose');
const typeDefs='./src/schema.graphql';
const Query = require('./resolvers/query');
const Mutation = require('./resolvers/mutation');
const Subscription = require('./resolvers/subscription');

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');

dotenv = require('dotenv');

dotenv.load();

const resolvers = {
  Query,
  Mutation,
  Subscription
}

let username = 'unknown';

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
  const db = mongoose.connection;
  db.on('error', ()  => {
    console.log('Failed to connect to mongoose')
  });
  db.once('open', () => {
    console.log('Connected to mongoose')
  });

  server.start(() => console.log(`Server is running`));
}

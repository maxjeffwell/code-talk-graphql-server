# Code Talk Server

<div align="center">

![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white)
![Apollo-GraphQL](https://img.shields.io/badge/-ApolloGraphQL-311C87?style=for-the-badge&logo=apollo-graphql)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

</div>

> 🚀 Real-time GraphQL API server for collaborative code editing and messaging

<h1 align="center"><img width=100% src=https://github.com/maxjeffwell/code-talk-graphql-client/blob/master/src/components/Images/Logo/CodeTalk_Title_Logo.png alt="Code Talk Logo"></h1>

## 🎯 Overview

Code Talk Server is a robust GraphQL API backend that powers real-time code collaboration and messaging. Built with Apollo Server, PostgreSQL, and Redis, it provides secure authentication, real-time subscriptions, and collaborative text editing features through a scalable architecture.

### ✨ Key Features

- **Real-time Communication**: GraphQL subscriptions for instant messaging and collaborative editing
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Scalable Architecture**: Redis Pub/Sub for distributed real-time events
- **Performance Optimized**: DataLoader integration prevents N+1 queries
- **Production Ready**: Full test suite, error handling, and monitoring

## 🔗 Live Demo

- **[GraphQL Playground](https://code-talk-server-5f982138903e.herokuapp.com/graphql)** - Explore the API
- **[Client Repository](https://github.com/maxjeffwell/code-talk-graphql-client)** - Frontend code

### Demo Accounts
```
Username: demo    | Password: demopassword
Username: demo2   | Password: demopassword
```

## 🛠️ Technology Stack

### Core Technologies
- **Apollo Server** `2.21.0` - GraphQL server with Express integration
- **GraphQL** `14.7.0` - Query language and schema definition
- **Node.js** `10.11.0` - JavaScript runtime
- **Express** `4.17.1` - Web application framework

### Database & ORM
- **PostgreSQL** - Primary database
- **Sequelize** `5.22.3` - SQL ORM with model associations
- **Redis** - Pub/Sub for real-time features

### Authentication & Security
- **jsonwebtoken** `8.5.1` - JWT token management
- **bcryptjs** `2.4.3` - Password hashing
- **CORS** - Cross-origin resource sharing

### Performance & Optimization
- **DataLoader** `1.4.0` - Batch loading and caching
- **ioredis** `4.22.0` - Redis client for Node.js

### Development Tools
- **Babel** `7.8.4` - ES6+ transpilation
- **Nodemon** `1.19.4` - Development auto-reload
- **Mocha** `6.2.3` - Testing framework
- **ESLint** - Code linting
- **Prettier** `1.19.1` - Code formatting

## 📁 Project Structure

```
src/
├── index.js                    # Main server entry point
├── schema/                     # GraphQL schema definitions
│   ├── index.js               # Schema composition
│   ├── user.js                # User type definitions
│   ├── message.js             # Message type definitions
│   └── editor.js              # Editor type definitions
├── resolvers/                  # GraphQL resolvers
│   ├── index.js               # Resolver composition
│   ├── user.js                # Authentication resolvers
│   ├── message.js             # Message CRUD resolvers
│   ├── editor.js              # Editor collaboration resolvers
│   └── authorization.js       # Auth middleware
├── models/                     # Database models
│   ├── index.js               # Sequelize setup
│   ├── user.js                # User model
│   ├── message.js             # Message model
│   └── room.js                # Room model (future)
├── loaders/                    # DataLoader implementations
│   ├── user.js                # User batch loading
│   └── message.js             # Message batch loading
├── subscription/               # Real-time subscriptions
│   ├── index.js               # Redis Pub/Sub setup
│   ├── message.js             # Message events
│   └── editor.js              # Editor events
└── tests/                      # Test suite
    ├── api.js                 # Test utilities
    ├── user.spec.js           # User tests
    └── message.spec.js        # Message tests
```

## 🚀 Getting Started

### Prerequisites
- Node.js 10.11.0+
- PostgreSQL 11+
- Redis 5+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/maxjeffwell/code-talk-graphql-server.git
cd code-talk-graphql-server
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/codetalk
TEST_DATABASE_URL=postgresql://username:password@localhost:5432/codetalk_test
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=8000
REDIS_HOST=localhost
REDIS_PASSWORD=
REDIS_PORT=6379
```

5. Initialize the database
```bash
npm run db:create
npm run db:migrate
npm run db:seed  # Optional: Add demo data
```

6. Start the development server
```bash
npm start
```

The GraphQL Playground will be available at `http://localhost:8000/graphql`

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```

## 📖 API Documentation

### Authentication

All queries and mutations (except `signIn` and `signUp`) require authentication via JWT token.

Add the token to your request headers:
```json
{
  "x-token": "your-jwt-token-here"
}
```

### Core Operations

#### User Authentication
```graphql
# Sign Up
mutation {
  signUp(username: "newuser", email: "user@example.com", password: "password") {
    token
    user {
      id
      username
      email
    }
  }
}

# Sign In
mutation {
  signIn(login: "username", password: "password") {
    token
    user {
      id
      username
    }
  }
}
```

#### Messaging
```graphql
# Get Messages (with pagination)
query {
  messages(cursor: "2020-01-01T00:00:00.000Z", limit: 20) {
    edges {
      id
      text
      createdAt
      user {
        username
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}

# Send Message
mutation {
  createMessage(text: "Hello, World!") {
    id
    text
    createdAt
    user {
      username
    }
  }
}

# Subscribe to New Messages
subscription {
  messageCreated {
    message {
      id
      text
      user {
        username
      }
    }
  }
}
```

#### Collaborative Editing
```graphql
# Subscribe to Editor Changes
subscription {
  editorChanged {
    content
    userId
    timestamp
  }
}

# Broadcast Editor Change
mutation {
  updateEditor(content: "const hello = 'world';") {
    success
  }
}
```

## 🏗️ Architecture Details

### GraphQL Schema Design
- **Modular Schema**: Separated by domain (user, message, editor)
- **Schema Stitching**: Combined with base types
- **Custom Scalars**: Date handling for timestamps

### Real-time Subscriptions
- **Redis Pub/Sub**: Scalable event broadcasting
- **WebSocket Support**: Persistent connections for real-time features
- **Event Types**: Message creation/deletion, editor changes

### Performance Optimizations
- **DataLoader**: Batch loading to prevent N+1 queries
- **Cursor Pagination**: Efficient large dataset handling
- **Request Caching**: Per-request cache layer

### Security Features
- **JWT Authentication**: Stateless token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Sequelize validators
- **CORS Configuration**: Controlled cross-origin access

## 🚧 Next Steps

### Immediate Priorities
- [ ] **Redis Cache Backend**: Implement shared cache for editor state persistence
- [ ] **Room-based Chat**: Complete multi-room functionality with access control
- [ ] **User Presence**: Real-time online/offline status indicators
- [ ] **Message Reactions**: Add emoji reactions to messages
- [ ] **File Sharing**: Support for code snippet and file uploads

### Performance Enhancements
- [ ] **Query Complexity Analysis**: Prevent expensive queries
- [ ] **Rate Limiting**: API request throttling
- [ ] **Response Caching**: GraphQL query result caching
- [ ] **Database Indexing**: Optimize frequent query patterns
- [ ] **Connection Pooling**: Improve database connection management

### Security Improvements
- [ ] **Two-Factor Authentication**: Enhanced account security
- [ ] **OAuth Integration**: Social login providers
- [ ] **API Key Management**: Alternative authentication method
- [ ] **Audit Logging**: Track sensitive operations
- [ ] **Input Sanitization**: Enhanced XSS protection

### Developer Experience
- [ ] **GraphQL Code Generation**: Type-safe client code
- [ ] **API Documentation**: Interactive API docs with examples
- [ ] **Development Seeds**: Comprehensive test data
- [ ] **Error Tracking**: Sentry integration
- [ ] **Performance Monitoring**: APM integration

### Feature Enhancements
- [ ] **Code Syntax Highlighting**: Language-specific highlighting
- [ ] **Collaborative Debugging**: Shared debugging sessions
- [ ] **Voice/Video Chat**: WebRTC integration
- [ ] **Screen Sharing**: For pair programming
- [ ] **Code Review Tools**: Inline comments and suggestions
- [ ] **Git Integration**: Version control within the editor
- [ ] **AI Code Completion**: ML-powered suggestions
- [ ] **Project Templates**: Quick start templates
- [ ] **Plugin System**: Extensible architecture
- [ ] **Mobile Support**: Responsive design and mobile apps

### Infrastructure & DevOps
- [ ] **Docker Support**: Containerized deployment
- [ ] **Kubernetes Configs**: Scalable orchestration
- [ ] **CI/CD Pipeline**: Automated testing and deployment
- [ ] **Load Balancing**: Multi-instance support
- [ ] **Database Migrations**: Automated schema updates
- [ ] **Backup Strategy**: Automated data backups
- [ ] **Monitoring Dashboard**: Real-time metrics
- [ ] **SSL/TLS**: HTTPS enforcement
- [ ] **CDN Integration**: Static asset delivery
- [ ] **Microservices**: Service decomposition

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GNU GPLv3 License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Jeff Maxwell**
- Email: [jeff@el-jefe.me](mailto:jeff@el-jefe.me)
- GitHub: [@maxjeffwell](https://github.com/maxjeffwell)
- Portfolio: [https://www.el-jefe.me](https://www.el-jefe.me)

---

<div align="center">

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)
[![npm version](https://img.shields.io/badge/npm-6.14.4-red.svg?style=for-the-badge)](https://www.npmjs.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

</div>
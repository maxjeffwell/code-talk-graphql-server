# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Code Talk Server** is a GraphQL API server for a real-time code collaboration and messaging application. The server provides secure authentication, real-time messaging through GraphQL subscriptions, and collaborative text editing features. Built with Apollo Server, PostgreSQL, and Redis for scalable real-time functionality.

## Commands

### Development
- `npm start` - Start development server with Babel transpilation and nodemon auto-reload
- `npm run test:run-server` - Run server with test database configuration
- `npm run test:execute-test` - Execute Mocha tests with Babel register
- `npm test` - Placeholder test command (exits with code 0)

### Node Version
- Requires Node.js 10.11.0 (specified for Heroku deployment)

## Architecture

### Server Configuration (`src/index.js`)
The main server file sets up:
- **Apollo Server** with Express middleware integration
- **GraphQL Playground** enabled for development and production
- **JWT Authentication** middleware for protected resolvers
- **CORS Configuration** for cross-origin GraphQL requests
- **DataLoader Integration** for efficient database queries
- **Subscription Handlers** for real-time WebSocket connections
- **PostgreSQL Database** sync with Sequelize ORM

### GraphQL Schema Structure

**Schema Organization** (`src/schema/`):
- **Modular Schema Design** - Separate files for each domain (user, message, editor)
- **Schema Stitching** - Combined schemas with link schema for base types
- **Custom Scalars** - Date scalar for timestamp handling

**Core Schema Types:**
- **User Schema** (`user.js`) - Authentication, user management
- **Message Schema** (`message.js`) - Real-time messaging with pagination
- **Editor Schema** (`editor.js`) - Collaborative text editing events

### Resolver Architecture (`src/resolvers/`)

**Authentication Resolvers** (`user.js`):
- `signUp` - User registration with password hashing
- `signIn` - Login with JWT token generation
- `me` - Current user query with authentication check
- `updateUser` / `deleteUser` - User management operations

**Message Resolvers** (`message.js`):
- `messages` - Cursor-based pagination for chat history
- `createMessage` - Send new message with real-time subscription
- `deleteMessage` - Remove message with authorization

**Real-time Subscriptions:**
- `messageCreated` - Real-time message notifications
- `editorChanged` - Collaborative text editing events

### Database Models (`src/models/`)

**Sequelize ORM Integration:**
- **User Model** - Authentication data with password hashing
- **Message Model** - Chat messages with user associations
- **Room Model** - Chat room functionality (commented out)

**Database Configuration:**
- PostgreSQL with Sequelize ORM
- Environment-based connection strings
- Model associations and foreign key relationships

### Real-time Features

**Redis Pub/Sub System** (`src/subscription/`):
- **Redis Integration** - Heroku Redis for scalable subscriptions
- **GraphQL Subscriptions** - Real-time message and editor events
- **Event Broadcasting** - Pub/Sub pattern for multi-client synchronization

**DataLoader Optimization** (`src/loaders/`):
- **Batch Loading** - Efficient database queries with DataLoader
- **N+1 Query Prevention** - Optimized user data fetching
- **Caching Layer** - Request-level caching for performance

## Key Technologies

- **Apollo Server 2.21.0** - GraphQL server with Express integration
- **GraphQL 14.7.0** - Schema definition and query language
- **Sequelize 5.22.3** - PostgreSQL ORM with model associations
- **Redis (ioredis 4.22.0)** - Pub/Sub engine for real-time subscriptions
- **DataLoader 1.4.0** - Batch loading and caching optimization
- **JWT (jsonwebtoken 8.5.1)** - Authentication token management
- **bcryptjs 2.4.3** - Password hashing for security

## Development Dependencies

- **Babel** - ES6+ transpilation with preset-env
- **Nodemon 1.19.4** - Development server auto-reload
- **Mocha 6.2.3** - Testing framework
- **ESLint** - Code linting with Airbnb base configuration
- **Prettier 1.19.1** - Code formatting

## Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `TEST_DATABASE_URL` - Test database connection
- `JWT_SECRET` - Secret key for JWT token signing
- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (defaults to 8000)
- `REDIS_HOST` / `REDIS_PASSWORD` / `REDIS_PORT` - Redis configuration

## Authentication & Authorization

**JWT Token System:**
- Token-based authentication via `x-token` header
- User session management with token expiration
- Protected resolvers requiring authentication
- Role-based authorization (admin functionality)

**Security Features:**
- Password hashing with bcrypt
- Token verification middleware
- Input validation and sanitization
- CORS configuration for API security

## Real-time Subscriptions

**GraphQL Subscriptions:**
- WebSocket-based real-time communication
- Redis Pub/Sub for scalable event broadcasting
- Message creation and deletion events
- Collaborative editor change events

**Subscription Events:**
- `MESSAGE_CREATED` - New message notifications
- `MESSAGE_DELETED` - Message removal events
- `EDITOR_CHANGED` - Text editor collaboration events

## Performance Optimizations

**DataLoader Implementation:**
- Batch loading for user data queries
- Request-level caching to prevent duplicate queries
- N+1 query problem resolution
- Efficient database access patterns

**Cursor-based Pagination:**
- Scalable message history loading
- Connection-based pagination with page info
- Performance optimization for large datasets

## Testing

**Test Structure:**
- Located in `/src/tests` directory
- `user.spec.js` - User authentication tests
- `message.spec.js` - Message functionality tests
- `api.js` - API integration test helpers
- Mocha + Chai testing framework

## Database Schema

**User Table:**
- id, username, email, password (hashed), role
- Associations with messages and rooms

**Message Table:**
- id, text, createdAt, userId
- Foreign key relationships with users

**Room Table (Commented):**
- Prepared for multi-room chat functionality
- User-room associations for access control

## GraphQL Playground

**Development Tools:**
- GraphQL Playground enabled in production
- Schema introspection for API exploration
- Real-time subscription testing
- JWT token authentication in headers

**Demo Accounts:**
- username: `demo` / password: `demopassword`
- username: `demo2` / password: `demopassword`

## Deployment

**Heroku Configuration:**
- `heroku-run-build-script: true` in package.json
- Static file serving for React client build
- Environment-based database connections
- Redis add-on for subscriptions

**Production Features:**
- GraphQL Playground enabled for API exploration
- Error formatting and debugging
- Request tracing and performance monitoring

## Error Handling

**GraphQL Error Formatting:**
- Sequelize validation error cleaning
- Authentication error messages
- User input validation errors
- Debug information in development

## Schema Linting

**GraphQL Schema Linter:**
- Enum values alphabetically sorted
- Schema validation rules
- Code quality enforcement

## Future Enhancements

- **Redis Cache Backend** - Shared cache for editor state persistence
- **Multi-room Support** - Complete room-based chat functionality
- **Enhanced Authorization** - Fine-grained permission system
- **Rate Limiting** - API request throttling
- **Real-time Presence** - User online/offline status

## Project Structure
```
src/
├── index.js                    # Main server entry point
├── schema/
│   ├── index.js               # Schema composition
│   ├── user.js                # User type definitions
│   ├── message.js             # Message type definitions
│   ├── editor.js              # Editor type definitions
│   └── schema.graphql         # Combined schema file
├── resolvers/
│   ├── index.js               # Resolver composition
│   ├── user.js                # User query/mutation resolvers
│   ├── message.js             # Message resolvers
│   ├── editor.js              # Editor resolvers
│   └── authorization.js       # Auth middleware
├── models/
│   ├── index.js               # Sequelize setup
│   ├── user.js                # User model
│   ├── message.js             # Message model
│   └── room.js                # Room model (future)
├── loaders/
│   ├── index.js               # DataLoader setup
│   ├── user.js                # User batch loading
│   ├── message.js             # Message batch loading
│   └── room.js                # Room batch loading
├── subscription/
│   ├── index.js               # Redis Pub/Sub setup
│   ├── message.js             # Message events
│   ├── editor.js              # Editor events
│   └── room.js                # Room events
└── tests/
    ├── api.js                 # Test utilities
    ├── user.spec.js           # User tests
    └── message.spec.js        # Message tests
```
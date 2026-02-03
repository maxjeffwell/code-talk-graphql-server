/**
 * Export GraphQL schema to SDL file for documentation generation
 * Run with: npx babel-node scripts/export-schema.js
 */
import { printSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Prevent config from trying to validate env vars
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dummy-secret-for-schema-export-only-32chars';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dummy-refresh-secret-for-schema-export32';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost/dummy';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.NODE_ENV = 'development';

import typeDefs from '../src/schema/index.js';
import resolvers from '../src/resolvers/index.js';

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Export to SDL
const sdl = printSchema(schema);

// Write to file
const outputPath = path.join(process.cwd(), 'schema.graphql');
fs.writeFileSync(outputPath, sdl);

console.log('Schema exported to schema.graphql');

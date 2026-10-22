/**
 * Export GraphQL schema to SDL file for documentation generation
 * Run with: npx babel-node scripts/export-schema.js  (or: npm run docs:schema)
 *
 * Builds the schema from the type definitions plus the Date scalar (so the
 * SDL names it DateTime, as the running server does). Importing the full
 * resolver tree would drag in the models and the Redis client, which keep
 * the event loop alive after the file is written and the process never
 * exits.
 */
import { printSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { DateTimeResolver } from 'graphql-scalars';
import fs from 'fs';
import path from 'path';

import typeDefs from '../src/schema/index.js';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers: { Date: DateTimeResolver },
});

const outputPath = path.join(process.cwd(), 'schema.graphql');
fs.writeFileSync(outputPath, printSchema(schema));

console.log(`Schema exported to ${outputPath}`);

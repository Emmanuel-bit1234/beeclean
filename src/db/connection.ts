import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create the database connection with serverless-friendly options
const sql = postgres(databaseUrl, {
  max: 1, // Limit connections for serverless (single connection per function)
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(sql, { schema });

export type Database = typeof db;
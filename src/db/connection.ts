// Load dotenv for local development (Vercel provides env vars automatically)
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const errorMessage = process.env.VERCEL
    ? 'DATABASE_URL environment variable is required. Please set it in your Vercel project settings: Settings → Environment Variables → Add DATABASE_URL'
    : 'DATABASE_URL environment variable is required. Please add it to your .env file.';
  throw new Error(errorMessage);
}

// Create the database connection with serverless-friendly options
const sql = postgres(databaseUrl, {
  max: 1, // Limit connections for serverless (single connection per function)
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(sql, { schema });

export type Database = typeof db;
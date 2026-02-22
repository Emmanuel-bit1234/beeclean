import 'dotenv/config';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(databaseUrl);

async function markMigrationApplied() {
  try {
    // Check if migration 0001 is already marked as applied
    const existing = await sql`
      SELECT * FROM drizzle.__drizzle_migrations 
      WHERE hash = '0001_add_surname_to_users'
    `;

    if (existing.length > 0) {
      console.log('Migration 0001_add_surname_to_users is already marked as applied.');
      return;
    }

    // Insert migration record
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES ('0001_add_surname_to_users', NOW())
      ON CONFLICT DO NOTHING
    `;

    console.log('✅ Migration 0001_add_surname_to_users marked as applied.');
  } catch (error) {
    console.error('Error marking migration as applied:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

markMigrationApplied();

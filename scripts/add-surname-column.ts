import 'dotenv/config';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = postgres(databaseUrl);

async function main() {
  try {
    await sql.unsafe(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "surname" varchar(255) DEFAULT '' NOT NULL;
    `);
    console.log('✅ Column "surname" added (or already exists).');
    await sql.unsafe(`
      ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'Agent';
    `);
    await sql.unsafe(`
      UPDATE "users" SET "surname" = '' WHERE "surname" IS NULL;
    `).catch(() => {});
    await sql.unsafe(`
      UPDATE "users" SET "role" = 'Agent' WHERE "role" IN ('Nurse', 'Doctor', 'User');
    `).catch(() => {});
    console.log('✅ Schema updates applied.');
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();

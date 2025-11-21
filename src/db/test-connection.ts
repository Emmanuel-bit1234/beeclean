import { db } from './connection.js';

export async function testConnection() {
  try {
    // Test the database connection
    const result = await db.execute('SELECT NOW() as current_time');
    console.log('Database connection successful!');
    console.log('Current time:', result[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

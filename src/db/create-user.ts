import 'dotenv/config';
import { db } from './connection.js';
import { users } from './schema.js';
import { hashPassword } from '../auth/utils.js';
import { eq } from 'drizzle-orm';
import type { RdcPayrollRole } from '../types/roles.js';

async function createUser() {
  try {
    const name = 'Emmanuel';
    const surname = 'Mbuya';
    const email = 'emmanuel@example.com';
    const password = 'password123';
    const role: RdcPayrollRole = 'Agent';

    console.log(`Creating user: ${name} ${surname}...`);
    
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log(`⚠️  User with email ${email} already exists:`);
      console.log(`  - ${existingUser[0].name} ${existingUser[0].surname} (${existingUser[0].email}): ${existingUser[0].role}`);
      process.exit(0);
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user (Payroll: name, surname, email, role)
    const result = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        surname,
        role,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        surname: users.surname,
        role: users.role,
      });
    
    if (result.length > 0) {
      console.log('✅ User created successfully:');
      console.log(`  - Name: ${result[0].name} ${result[0].surname}`);
      console.log(`  - Email: ${result[0].email}`);
      console.log(`  - Role: ${result[0].role}`);
      console.log(`  - ID: ${result[0].id}`);
      console.log(`\n📝 Login credentials:`);
      console.log(`  - Email: ${email}`);
      console.log(`  - Password: ${password}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
}

createUser();

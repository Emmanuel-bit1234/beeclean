import 'dotenv/config';
import { db } from './connection.js';
import { users } from './schema.js';
import { eq, sql } from 'drizzle-orm';

async function setAdminRole() {
  try {
    console.log('Setting Admin user to Admin role...');
    
    // Update the Admin user (Admin@edtriage.co.za) to have Admin role
    const result = await db
      .update(users)
      .set({ role: 'Admin' })
      .where(eq(users.email, 'Admin@edtriage.co.za'))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });
    
    if (result.length > 0) {
      console.log('✅ Admin user updated successfully:');
      console.log(`  - ${result[0].name} (${result[0].email}): ${result[0].role}`);
    } else {
      console.log('⚠️  Admin user not found with email: Admin@edtriage.co.za');
    }
    
    // Show all users with their roles
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    }).from(users);
    
    console.log('\n📊 All users and their roles:');
    allUsers.forEach(user => {
      const roleIcon = user.role === 'Admin' ? '👑' : user.role === 'Doctor' ? '👨‍⚕️' : user.role === 'Nurse' ? '👩‍⚕️' : '👤';
      console.log(`  ${roleIcon} ${user.name} (${user.email}): ${user.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating admin role:', error);
    process.exit(1);
  }
}

setAdminRole();


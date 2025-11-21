import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, or, like, count, sql } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';
import type { UpdateUserRequest, UpdateRoleRequest } from '../types/user.js';

const usersRoute = new Hono<{ Variables: AuthVariables }>();

// Search users (must be before /:id route)
usersRoute.get('/search', authMiddleware, async (c) => {
  try {
    const query = c.req.query('query');
    const role = c.req.query('role') as 'Admin' | 'Doctor' | 'Nurse' | 'User' | undefined;
    const limit = parseInt(c.req.query('limit') || '20');

    if (!query) {
      return c.json({ error: 'Query parameter is required' }, 400);
    }

    const searchTerm = `%${query}%`;
    const conditions: any[] = [
      or(
        like(users.name, searchTerm),
        like(users.email, searchTerm)
      ),
    ];

    if (role) {
      conditions.push(eq(users.role, role));
    }

    const whereClause = and(...conditions);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const total = Number(totalResult[0]?.count || 0);

    // Get users
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(whereClause)
      .limit(limit);

    return c.json({
      users: usersList,
      total,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return c.json({ error: 'Failed to search users' }, 500);
  }
});

// Get all users
usersRoute.get('/', authMiddleware, async (c) => {
  try {
    const role = c.req.query('role') as 'Admin' | 'Doctor' | 'Nurse' | 'User' | undefined;
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const search = c.req.query('search');

    // Build where conditions
    const conditions: any[] = [];

    if (role) {
      conditions.push(eq(users.role, role));
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          like(users.name, searchTerm),
          like(users.email, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const total = Number(totalResult[0]?.count || 0);

    // Get users
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    return c.json({
      users: usersList,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Get user by ID
usersRoute.get('/:id', authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (user.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: user[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// Update user
usersRoute.put('/:id', authMiddleware, async (c) => {
  try {
    const currentUser = c.get('user');
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json() as UpdateUserRequest;

    if (isNaN(id)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Authorization: Users can only update their own profile unless they're admin
    if (currentUser.id !== id && currentUser.role !== 'Admin') {
      return c.json({ error: 'You can only update your own profile' }, 403);
    }

    // Validate that at least one field is provided
    if (!body.name && !body.email) {
      return c.json({ error: 'At least one field (name or email) must be provided' }, 400);
    }

    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return c.json({ error: 'Invalid email format' }, 400);
      }

      // Check if email already exists (excluding current user)
      const emailExists = await db
        .select()
        .from(users)
        .where(and(eq(users.email, body.email), sql`${users.id} != ${id}`))
        .limit(1);

      if (emailExists.length > 0) {
        return c.json({ error: 'Email already exists' }, 409);
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return c.json({
      message: 'User updated successfully',
      user: updatedUser[0],
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// Update user role (Admin only)
usersRoute.put('/:id/role', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json() as UpdateRoleRequest;

    if (isNaN(id)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    // Validate role
    const validRoles = ['Admin', 'Doctor', 'Nurse', 'User'];
    if (!validRoles.includes(body.role)) {
      return c.json({
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      }, 400);
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Safety check: Cannot remove the last Admin user
    if (existingUser[0].role === 'Admin' && body.role !== 'Admin') {
      const adminCount = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'Admin'));

      if (Number(adminCount[0]?.count || 0) <= 1) {
        return c.json({ error: 'Cannot remove the last Admin user' }, 409);
      }
    }

    const updatedUser = await db
      .update(users)
      .set({
        role: body.role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return c.json({
      message: 'User role updated successfully',
      user: updatedUser[0],
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return c.json({ error: 'Failed to update user role' }, 500);
  }
});

// Delete user (Admin only)
usersRoute.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Safety check: Cannot delete the last Admin user
    if (existingUser[0].role === 'Admin') {
      const adminCount = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'Admin'));

      if (Number(adminCount[0]?.count || 0) <= 1) {
        return c.json({ error: 'Cannot delete the last Admin user' }, 409);
      }
    }

    await db
      .delete(users)
      .where(eq(users.id, id));

    return c.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

export default usersRoute;


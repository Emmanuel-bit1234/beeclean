import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateToken } from './utils.js';
import { authMiddleware } from './middleware.js';
import { RDC_PAYROLL_ROLES, isValidRole } from '../types/roles.js';
import type { LoginRequest, RegisterRequest, AuthResponse, AuthVariables } from '../types/auth.js';

const auth = new Hono<{ Variables: AuthVariables }>();

// Register endpoint - Payroll: requires name, surname, email, role
auth.post('/register', async (c) => {
  try {
    const body: RegisterRequest = await c.req.json();
    const { name, surname, email, role, password } = body;

    // Validate required fields: name, surname, email, role
    if (!name?.trim()) {
      return c.json({ error: 'Name is required' }, 400);
    }
    if (!surname?.trim()) {
      return c.json({ error: 'Surname is required' }, 400);
    }
    if (!email?.trim()) {
      return c.json({ error: 'Email is required' }, 400);
    }
    if (!role) {
      return c.json({ error: 'Role is required' }, 400);
    }
    if (!password) {
      return c.json({ error: 'Password is required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    if (!isValidRole(role)) {
      return c.json({ 
        error: `Invalid role. Must be one of: ${RDC_PAYROLL_ROLES.join(', ')}` 
      }, 400);
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email.trim())).limit(1);
    if (existingUser.length > 0) {
      return c.json({ error: 'User with this email already exists' }, 409);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const newUser = await db.insert(users).values({
      email: email.trim(),
      passwordHash,
      name: name.trim(),
      surname: surname.trim(),
      role,
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      surname: users.surname,
      role: users.role,
    });

    // Generate token
    const token = generateToken({
      userId: newUser[0].id,
      email: newUser[0].email,
    });

    const response: AuthResponse = {
      user: newUser[0],
      token,
    };

    return c.json(response, 201);
  } catch (error) {
    const err = error as Error;
    console.error('Registration error:', err?.message ?? error);
    // Expose safe error for debugging (e.g. missing column, constraint)
    const message = err?.message ?? 'Registration failed';
    const isDbError = message.includes('column') || message.includes('relation') || message.includes('duplicate') || message.includes('violates');
    return c.json(
      { error: 'Registration failed', ...(isDbError && { detail: message }) },
      500
    );
  }
});

// Login endpoint
auth.post('/login', async (c) => {
  try {
    const body: LoginRequest = await c.req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Find user
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userResult.length === 0) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const user = userResult[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        role: user.role,
      },
      token,
    };

    return c.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Get current user endpoint
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// Logout endpoint (client-side token removal)
auth.post('/logout', authMiddleware, async (c) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token. This endpoint just confirms the user was authenticated.
  return c.json({ message: 'Logged out successfully' });
});

export default auth;

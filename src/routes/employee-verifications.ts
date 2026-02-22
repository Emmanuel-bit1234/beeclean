import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { employeeVerifications, employees, users } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, desc } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const route = new Hono<{ Variables: AuthVariables }>();

// List verifications for an employee
route.get('/employee/:employeeId', authMiddleware, async (c) => {
  const employeeId = parseInt(c.req.param('employeeId'), 10);
  if (isNaN(employeeId)) return c.json({ error: 'Invalid employee ID' }, 400);
  const rows = await db
    .select({
      id: employeeVerifications.id,
      employeeId: employeeVerifications.employeeId,
      step: employeeVerifications.step,
      status: employeeVerifications.status,
      verifiedAt: employeeVerifications.verifiedAt,
      fingerprintUsed: employeeVerifications.fingerprintUsed,
      notes: employeeVerifications.notes,
      verifiedByUserName: users.name,
      verifiedByUserSurname: users.surname,
    })
    .from(employeeVerifications)
    .leftJoin(users, eq(employeeVerifications.verifiedByUserId, users.id))
    .where(eq(employeeVerifications.employeeId, employeeId))
    .orderBy(desc(employeeVerifications.createdAt));
  return c.json({ verifications: rows });
});

// List all pending verifications (for ministry verification modules)
route.get('/pending', authMiddleware, async (c) => {
  const step = c.req.query('step');
  const rows = await db
    .select()
    .from(employeeVerifications)
    .where(eq(employeeVerifications.status, 'pending'))
    .orderBy(employeeVerifications.createdAt);
  let result = rows;
  if (step) result = result.filter((r) => r.step === step);
  return c.json({ verifications: result });
});

// Create a verification step (admin / ministry)
route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      employeeId: number;
      step: string;
      notes?: string;
    };
    const { employeeId, step, notes } = body;
    if (!employeeId || !step) return c.json({ error: 'employeeId and step required' }, 400);
    const emp = await db.select().from(employees).where(eq(employees.id, Number(employeeId))).limit(1);
    if (emp.length === 0) return c.json({ error: 'Employee not found' }, 404);
    const [created] = await db
      .insert(employeeVerifications)
      .values({
        employeeId: Number(employeeId),
        step: String(step).trim(),
        notes: notes?.trim() || null,
      })
      .returning();
    return c.json({ verification: created }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to create verification' }, 500);
  }
});

// Approve or reject verification (with fingerprint placeholder)
route.put('/:id/approve', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const body = await c.req.json() as { status: 'approved' | 'rejected'; fingerprintUsed?: boolean; notes?: string };
  const { status, fingerprintUsed, notes } = body;
  if (status !== 'approved' && status !== 'rejected') {
    return c.json({ error: 'status must be approved or rejected' }, 400);
  }
  const user = c.get('user');
  const [updated] = await db
    .update(employeeVerifications)
    .set({
      status,
      verifiedByUserId: user.id,
      verifiedAt: new Date(),
      fingerprintUsed: fingerprintUsed ?? false,
      notes: notes ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(employeeVerifications.id, id), eq(employeeVerifications.status, 'pending')))
    .returning();
  if (!updated) return c.json({ error: 'Verification not found or already processed' }, 404);

  // If approved and this was final step, mark employee verified
  if (status === 'approved') {
    const steps = await db
      .select()
      .from(employeeVerifications)
      .where(eq(employeeVerifications.employeeId, updated.employeeId));
    const allApproved = steps.every((s) => s.status === 'approved');
    if (allApproved) {
      await db
        .update(employees)
        .set({
          verifiedAt: new Date(),
          verifiedByUserId: user.id,
          updatedAt: new Date(),
        })
        .where(eq(employees.id, updated.employeeId));
    }
  }
  return c.json({ verification: updated });
});

export default route;

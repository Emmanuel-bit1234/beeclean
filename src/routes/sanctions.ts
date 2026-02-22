import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { sanctions, employees, users } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, desc } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const route = new Hono<{ Variables: AuthVariables }>();

// List sanctions (employee_id optional)
route.get('/', authMiddleware, async (c) => {
  const employeeId = c.req.query('employee_id');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const eid = employeeId ? parseInt(employeeId, 10) : null;
  const rows = await (eid != null && !isNaN(eid)
    ? db
        .select({
          sanction: sanctions,
          employeeName: employees.name,
          employeeSurname: employees.surname,
          employeeNumber: employees.employeeNumber,
          createdByName: users.name,
          createdBySurname: users.surname,
        })
        .from(sanctions)
        .leftJoin(employees, eq(sanctions.employeeId, employees.id))
        .leftJoin(users, eq(sanctions.createdByUserId, users.id))
        .where(eq(sanctions.employeeId, eid))
        .orderBy(desc(sanctions.appliedAt))
        .limit(limit)
        .offset(offset)
    : db
        .select({
          sanction: sanctions,
          employeeName: employees.name,
          employeeSurname: employees.surname,
          employeeNumber: employees.employeeNumber,
          createdByName: users.name,
          createdBySurname: users.surname,
        })
        .from(sanctions)
        .leftJoin(employees, eq(sanctions.employeeId, employees.id))
        .leftJoin(users, eq(sanctions.createdByUserId, users.id))
        .orderBy(desc(sanctions.appliedAt))
        .limit(limit)
        .offset(offset));

  return c.json({
    sanctions: rows.map((r) => ({
      ...r.sanction,
      employeeName: r.employeeName,
      employeeSurname: r.employeeSurname,
      employeeNumber: r.employeeNumber,
      createdByName: r.createdByName,
      createdBySurname: r.createdBySurname,
    })),
  });
});

// Get one sanction
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [row] = await db
    .select({
      sanction: sanctions,
      employeeName: employees.name,
      employeeSurname: employees.surname,
      employeeNumber: employees.employeeNumber,
    })
    .from(sanctions)
    .leftJoin(employees, eq(sanctions.employeeId, employees.id))
    .where(eq(sanctions.id, id))
    .limit(1);
  if (!row) return c.json({ error: 'Sanction not found' }, 404);
  return c.json({
    sanction: {
      ...row.sanction,
      employeeName: row.employeeName,
      employeeSurname: row.employeeSurname,
      employeeNumber: row.employeeNumber,
    },
  });
});

// Create sanction (admin) – e.g. suspension, deduction; can trigger message
route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      employeeId: number;
      type: string;
      amountDeduction?: string | number;
      reason: string;
    };
    const { employeeId, type, amountDeduction, reason } = body;
    if (!employeeId || !type || !reason) {
      return c.json({ error: 'employeeId, type, reason required' }, 400);
    }
    const user = c.get('user');
    const [emp] = await db.select().from(employees).where(eq(employees.id, Number(employeeId))).limit(1);
    if (!emp) return c.json({ error: 'Employee not found' }, 404);
    const [created] = await db
      .insert(sanctions)
      .values({
        employeeId: Number(employeeId),
        type: String(type).trim(),
        amountDeduction: amountDeduction != null ? String(amountDeduction) : '0',
        reason: String(reason).trim(),
        createdByUserId: user.id,
      })
      .returning();
    return c.json({ sanction: created }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to create sanction' }, 500);
  }
});

export default route;

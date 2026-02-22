import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { departments, ministries } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const route = new Hono<{ Variables: AuthVariables }>();

// List departments (optional ministryId)
route.get('/', authMiddleware, async (c) => {
  try {
    const ministryId = c.req.query('ministry_id');
    const mid = ministryId ? parseInt(ministryId, 10) : null;
    const rows = await (mid != null && !isNaN(mid)
      ? db
          .select({
            id: departments.id,
            ministryId: departments.ministryId,
            name: departments.name,
            code: departments.code,
            budgetMonthly: departments.budgetMonthly,
            ministryName: ministries.name,
            ministryCode: ministries.code,
          })
          .from(departments)
          .leftJoin(ministries, eq(departments.ministryId, ministries.id))
          .where(eq(departments.ministryId, mid))
          .orderBy(departments.name)
      : db
          .select({
            id: departments.id,
            ministryId: departments.ministryId,
            name: departments.name,
            code: departments.code,
            budgetMonthly: departments.budgetMonthly,
            ministryName: ministries.name,
            ministryCode: ministries.code,
          })
          .from(departments)
          .leftJoin(ministries, eq(departments.ministryId, ministries.id))
          .orderBy(departments.name));
    return c.json({
      departments: rows.map((r) => ({
        id: r.id,
        ministryId: r.ministryId,
        name: r.name,
        code: r.code,
        budgetMonthly: r.budgetMonthly,
        ministryName: r.ministryName,
        ministryCode: r.ministryCode,
      })),
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to list departments' }, 500);
  }
});

// Get one department
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const row = await db
    .select({
      department: departments,
      ministryName: ministries.name,
      ministryCode: ministries.code,
    })
    .from(departments)
    .leftJoin(ministries, eq(departments.ministryId, ministries.id))
    .where(eq(departments.id, id))
    .limit(1);
  if (row.length === 0) return c.json({ error: 'Department not found' }, 404);
  return c.json({ department: { ...row[0].department, ministryName: row[0].ministryName, ministryCode: row[0].ministryCode } });
});

// Create department (admin)
route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      ministryId: number;
      name: string;
      code: string;
      budgetMonthly?: string | number;
    };
    const { ministryId, name, code, budgetMonthly } = body;
    if (!name || !code || ministryId == null) {
      return c.json({ error: 'ministryId, name, code required' }, 400);
    }
    const [created] = await db
      .insert(departments)
      .values({
        ministryId: Number(ministryId),
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        budgetMonthly: budgetMonthly != null ? String(budgetMonthly) : '0',
      })
      .returning();
    return c.json({ department: created }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to create department' }, 500);
  }
});

// Update department (admin)
route.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const body = await c.req.json() as {
    ministryId?: number;
    name?: string;
    code?: string;
    budgetMonthly?: string | number;
  };
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.ministryId != null) update.ministryId = Number(body.ministryId);
  if (body.name != null) update.name = String(body.name).trim();
  if (body.code != null) update.code = String(body.code).trim().toUpperCase();
  if (body.budgetMonthly != null) update.budgetMonthly = String(body.budgetMonthly);
  const [updated] = await db
    .update(departments)
    .set(update as typeof departments.$inferInsert)
    .where(eq(departments.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Department not found' }, 404);
  return c.json({ department: updated });
});

// Delete department (admin)
route.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  await db.delete(departments).where(eq(departments.id, id));
  return c.json({ message: 'Department deleted' });
});

export default route;

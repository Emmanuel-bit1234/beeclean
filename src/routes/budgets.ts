import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { budgets, ministries, departments } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, desc } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const route = new Hono<{ Variables: AuthVariables }>();

// List budgets (ministry_id, department_id, period_month, period_year)
route.get('/', authMiddleware, async (c) => {
  const ministryId = c.req.query('ministry_id');
  const departmentId = c.req.query('department_id');
  const periodMonth = c.req.query('period_month');
  const periodYear = c.req.query('period_year');

  const conditions: ReturnType<typeof eq>[] = [];
  if (ministryId) {
    const mid = parseInt(ministryId, 10);
    if (!isNaN(mid)) conditions.push(eq(budgets.ministryId, mid));
  }
  if (departmentId) {
    const did = parseInt(departmentId, 10);
    if (!isNaN(did)) conditions.push(eq(budgets.departmentId, did));
  }
  if (periodMonth) {
    const m = parseInt(periodMonth, 10);
    if (!isNaN(m)) conditions.push(eq(budgets.periodMonth, m));
  }
  if (periodYear) {
    const y = parseInt(periodYear, 10);
    if (!isNaN(y)) conditions.push(eq(budgets.periodYear, y));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select({
      budget: budgets,
      ministryName: ministries.name,
      ministryCode: ministries.code,
      departmentName: departments.name,
    })
    .from(budgets)
    .leftJoin(ministries, eq(budgets.ministryId, ministries.id))
    .leftJoin(departments, eq(budgets.departmentId, departments.id))
    .where(where)
    .orderBy(desc(budgets.periodYear), desc(budgets.periodMonth), budgets.ministryId);
  return c.json({
    budgets: rows.map((r) => ({
      ...r.budget,
      ministryName: r.ministryName,
      departmentName: r.departmentName,
    })),
  });
});

// Get one budget
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [row] = await db
    .select({
      budget: budgets,
      ministryName: ministries.name,
      ministryCode: ministries.code,
      departmentName: departments.name,
    })
    .from(budgets)
    .leftJoin(ministries, eq(budgets.ministryId, ministries.id))
    .leftJoin(departments, eq(budgets.departmentId, departments.id))
    .where(eq(budgets.id, id))
    .limit(1);
  if (!row) return c.json({ error: 'Budget not found' }, 404);
  return c.json({
    budget: {
      ...row.budget,
      ministryName: row.ministryName,
      departmentName: row.departmentName,
    },
  });
});

// Create budget (admin) – monthly allocation per ministry/department
route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      ministryId: number;
      departmentId?: number;
      periodMonth: number;
      periodYear: number;
      amount: string | number;
    };
    const { ministryId, periodMonth, periodYear, amount, departmentId } = body;
    if (ministryId == null || periodMonth == null || periodYear == null || amount == null) {
      return c.json({ error: 'ministryId, periodMonth, periodYear, amount required' }, 400);
    }
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      return c.json({ error: 'amount must be a non-negative number' }, 400);
    }
    const [created] = await db
      .insert(budgets)
      .values({
        ministryId: Number(ministryId),
        departmentId: departmentId != null ? Number(departmentId) : null,
        periodMonth: Number(periodMonth),
        periodYear: Number(periodYear),
        amount: String(amount),
      })
      .returning();
    return c.json({ budget: created }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to create budget' }, 500);
  }
});

// Update budget (admin)
route.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const body = await c.req.json() as { amount?: string | number; departmentId?: number | null };
  const update: Record<string, unknown> = {};
  if (body.amount != null) update.amount = String(body.amount);
  if (body.departmentId !== undefined) update.departmentId = body.departmentId;
  if (Object.keys(update).length === 0) return c.json({ error: 'No fields to update' }, 400);
  const [updated] = await db
    .update(budgets)
    .set(update as typeof budgets.$inferInsert)
    .where(eq(budgets.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Budget not found' }, 404);
  return c.json({ budget: updated });
});

// Delete budget (admin)
route.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [existing] = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Budget not found' }, 404);
  await db.delete(budgets).where(eq(budgets.id, id));
  return c.json({ message: 'Budget deleted' });
});

export default route;

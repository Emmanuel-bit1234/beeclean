import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { ministries } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, like, sql } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const route = new Hono<{ Variables: AuthVariables }>();

// List ministries (optional filter by sector, payment day)
route.get('/', authMiddleware, async (c) => {
  try {
    const sector = c.req.query('sector');
    const paymentDay = c.req.query('payment_day');
    const search = c.req.query('search');

    let query = db.select().from(ministries).orderBy(ministries.name);

    const rows = await query;
    let result = rows;

    if (sector) {
      result = result.filter((m) => m.sectorCategory === sector);
    }
    if (paymentDay) {
      const day = parseInt(paymentDay, 10);
      if (!isNaN(day)) result = result.filter((m) => m.paymentDayOfMonth === day);
    }
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.code.toLowerCase().includes(term) ||
          m.sectorCategory.toLowerCase().includes(term)
      );
    }

    return c.json({ ministries: result });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to list ministries' }, 500);
  }
});

// Get one ministry
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const row = await db.select().from(ministries).where(eq(ministries.id, id)).limit(1);
  if (row.length === 0) return c.json({ error: 'Ministry not found' }, 404);
  return c.json({ ministry: row[0] });
});

// Create ministry (admin)
route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      name: string;
      code: string;
      sectorCategory: string;
      paymentDayOfMonth: number;
    };
    const { name, code, sectorCategory, paymentDayOfMonth } = body;
    if (!name || !code || !sectorCategory || paymentDayOfMonth == null) {
      return c.json({ error: 'name, code, sectorCategory, paymentDayOfMonth required' }, 400);
    }
    const day = Number(paymentDayOfMonth);
    if (day < 1 || day > 31) return c.json({ error: 'paymentDayOfMonth must be 1-31' }, 400);

    const [created] = await db
      .insert(ministries)
      .values({
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        sectorCategory: String(sectorCategory).trim(),
        paymentDayOfMonth: day,
      })
      .returning();
    return c.json({ ministry: created }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to create ministry' }, 500);
  }
});

// Update ministry (admin)
route.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const body = await c.req.json() as {
    name?: string;
    code?: string;
    sectorCategory?: string;
    paymentDayOfMonth?: number;
  };
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name != null) update.name = String(body.name).trim();
  if (body.code != null) update.code = String(body.code).trim().toUpperCase();
  if (body.sectorCategory != null) update.sectorCategory = String(body.sectorCategory).trim();
  if (body.paymentDayOfMonth != null) {
    const day = Number(body.paymentDayOfMonth);
    if (day < 1 || day > 31) return c.json({ error: 'paymentDayOfMonth must be 1-31' }, 400);
    update.paymentDayOfMonth = day;
  }
  const [updated] = await db
    .update(ministries)
    .set(update as typeof ministries.$inferInsert)
    .where(eq(ministries.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Ministry not found' }, 404);
  return c.json({ ministry: updated });
});

// Delete ministry (admin)
route.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  await db.delete(ministries).where(eq(ministries.id, id));
  return c.json({ message: 'Ministry deleted' });
});

export default route;

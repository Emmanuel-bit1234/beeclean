import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { messages, employees } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, desc } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const MESSAGE_TYPES = ['pay_notification', 'sanction', 'promotion', 'deduction', 'general'] as const;

const route = new Hono<{ Variables: AuthVariables }>();

// List messages for an employee
route.get('/employee/:employeeId', authMiddleware, async (c) => {
  const employeeId = parseInt(c.req.param('employeeId'), 10);
  if (isNaN(employeeId)) return c.json({ error: 'Invalid employee ID' }, 400);
  const type = c.req.query('type');
  const unreadOnly = c.req.query('unread_only') === 'true';
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

  let query = db
    .select()
    .from(messages)
    .where(eq(messages.employeeId, employeeId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  const conditions: ReturnType<typeof eq>[] = [eq(messages.employeeId, employeeId)];
  if (type && MESSAGE_TYPES.includes(type as typeof MESSAGE_TYPES[number])) {
    conditions.push(eq(messages.type, type as typeof MESSAGE_TYPES[number]));
  }
  if (unreadOnly) {
    const rows = await db.select().from(messages).where(and(...conditions)).orderBy(desc(messages.createdAt)).limit(limit);
    const filtered = rows.filter((r) => !r.readAt);
    return c.json({ messages: filtered });
  }
  const rows = await db.select().from(messages).where(and(...conditions)).orderBy(desc(messages.createdAt)).limit(limit);
  return c.json({ messages: rows });
});

// Get one message
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [row] = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  if (!row) return c.json({ error: 'Message not found' }, 404);
  return c.json({ message: row });
});

// Send message (system: pay day, sanction, promotion, deduction)
route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      employeeId: number;
      type: typeof MESSAGE_TYPES[number];
      title: string;
      body?: string;
    };
    const { employeeId, type, title, body: bodyText } = body;
    if (!employeeId || !type || !title) {
      return c.json({ error: 'employeeId, type, title required' }, 400);
    }
    if (!MESSAGE_TYPES.includes(type)) return c.json({ error: 'Invalid type' }, 400);
    const [emp] = await db.select().from(employees).where(eq(employees.id, Number(employeeId))).limit(1);
    if (!emp) return c.json({ error: 'Employee not found' }, 404);
    const [created] = await db
      .insert(messages)
      .values({
        employeeId: Number(employeeId),
        type,
        title: String(title).trim(),
        body: bodyText?.trim() || null,
      })
      .returning();
    return c.json({ message: created }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// Mark as read
route.put('/:id/read', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [updated] = await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(eq(messages.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Message not found' }, 404);
  return c.json({ message: updated });
});

export default route;

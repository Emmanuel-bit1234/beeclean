import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { employees, messages } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';
import { sendEmail } from '../services/email.js';

const route = new Hono<{ Variables: AuthVariables }>();

route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      employeeId: number;
      subject: string;
      body: string;
    };

    const { employeeId, subject, body: text } = body;
    if (!employeeId || !subject?.trim() || !text?.trim()) {
      return c.json({ error: 'employeeId, subject, body required' }, 400);
    }

    const [emp] = await db
      .select({
        id: employees.id,
        email: employees.email,
        name: employees.name,
        surname: employees.surname,
      })
      .from(employees)
      .where(eq(employees.id, Number(employeeId)))
      .limit(1);

    if (!emp) return c.json({ error: 'Employee not found' }, 404);
    if (!emp.email) return c.json({ error: 'Employee has no email on record' }, 400);

    await sendEmail({
      to: emp.email,
      subject: subject.trim(),
      text: text.trim(),
    });

    // Log as a general message for the employee
    await db.insert(messages).values({
      employeeId: emp.id,
      type: 'general',
      title: subject.trim(),
      body: text.trim(),
    });

    return c.json(
      {
        status: 'sent',
        to: emp.email,
        employeeId: emp.id,
      },
      201,
    );
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to send email' }, 500);
  }
});

export default route;


import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { employees, ministries, departments } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, or, like, sql } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const route = new Hono<{ Variables: AuthVariables }>();

// List employees (filters: ministry_id, department_id, status, search)
route.get('/', authMiddleware, async (c) => {
  try {
    const ministryId = c.req.query('ministry_id');
    const departmentId = c.req.query('department_id');
    const status = c.req.query('status');
    const search = c.req.query('search');
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const conditions: ReturnType<typeof eq>[] = [];
    if (ministryId) {
      const mid = parseInt(ministryId, 10);
      if (!isNaN(mid)) conditions.push(eq(employees.ministryId, mid));
    }
    if (departmentId) {
      const did = parseInt(departmentId, 10);
      if (!isNaN(did)) conditions.push(eq(employees.departmentId, did));
    }
    if (status && ['active', 'suspended', 'deceased', 'retired'].includes(status)) {
      conditions.push(eq(employees.status, status as 'active' | 'suspended' | 'deceased' | 'retired'));
    }
    if (search) {
      const term = `%${search}%`;
      conditions.push(
        or(
          like(employees.name, term),
          like(employees.surname, term),
          like(employees.employeeNumber, term),
          like(employees.position, term)
        )!
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: employees.id,
        ministryId: employees.ministryId,
        departmentId: employees.departmentId,
        employeeNumber: employees.employeeNumber,
        name: employees.name,
        surname: employees.surname,
        position: employees.position,
        salary: employees.salary,
        status: employees.status,
        bankAccount: employees.bankAccount,
        bankName: employees.bankName,
        mobileMoneyProvider: employees.mobileMoneyProvider,
        mobileMoneyNumber: employees.mobileMoneyNumber,
        verifiedAt: employees.verifiedAt,
        ministryName: ministries.name,
        departmentName: departments.name,
      })
      .from(employees)
      .leftJoin(ministries, eq(employees.ministryId, ministries.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(where)
      .orderBy(employees.surname, employees.name)
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(where);
    const total = countResult[0]?.count ?? 0;

    return c.json({
      employees: rows.map((r) => ({
        ...r,
        ministryName: r.ministryName,
        departmentName: r.departmentName,
      })),
      total,
      limit,
      offset,
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to list employees' }, 500);
  }
});

// Get one employee (position & salary confirmation view)
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const row = await db
    .select({
      employee: employees,
      ministryName: ministries.name,
      ministryCode: ministries.code,
      departmentName: departments.name,
      departmentCode: departments.code,
    })
    .from(employees)
    .leftJoin(ministries, eq(employees.ministryId, ministries.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.id, id))
    .limit(1);
  if (row.length === 0) return c.json({ error: 'Employee not found' }, 404);
  const { employee, ministryName, ministryCode, departmentName, departmentCode } = row[0];
  return c.json({
    employee: {
      ...employee,
      ministryName,
      ministryCode,
      departmentName,
      departmentCode,
    },
  });
});

/**
 * Generate next employee number for a ministry: {ministryCode}-{seq}, e.g. FIN-001, BUD-002.
 * If frontend sends employeeNumber, it is used; otherwise we auto-generate from ministry.
 */
async function generateEmployeeNumber(ministryId: number): Promise<string> {
  const [ministry] = await db
    .select({ code: ministries.code })
    .from(ministries)
    .where(eq(ministries.id, ministryId))
    .limit(1);
  if (!ministry) throw new Error('Ministry not found');
  const prefix = ministry.code.trim().toUpperCase();
  const existing = await db
    .select({ employeeNumber: employees.employeeNumber })
    .from(employees)
    .where(eq(employees.ministryId, ministryId));
  const regex = new RegExp(`^${escapeRegex(prefix)}-(\\d+)$`, 'i');
  let maxNum = 0;
  for (const row of existing) {
    const m = row.employeeNumber.match(regex);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Create employee (admin). employeeNumber is optional; auto-generated from ministry if omitted.
route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      ministryId: number;
      departmentId?: number;
      employeeNumber?: string;
      name: string;
      surname: string;
      position: string;
      salary: string | number;
      bankAccount?: string;
      bankName?: string;
      mobileMoneyProvider?: 'mpesa' | 'airtel_money' | 'orange_money' | 'none';
      mobileMoneyNumber?: string;
    };
    const {
      ministryId,
      departmentId,
      employeeNumber: bodyEmployeeNumber,
      name,
      surname,
      position,
      salary,
      bankAccount,
      bankName,
      mobileMoneyProvider,
      mobileMoneyNumber,
    } = body;
    if (!ministryId || !name || !surname || !position || salary == null) {
      return c.json({ error: 'ministryId, name, surname, position, salary required' }, 400);
    }
    const mid = Number(ministryId);
    const employeeNumber = bodyEmployeeNumber?.trim()
      ? String(bodyEmployeeNumber).trim()
      : await generateEmployeeNumber(mid);
    const [created] = await db
      .insert(employees)
      .values({
        ministryId: mid,
        departmentId: departmentId != null ? Number(departmentId) : null,
        employeeNumber,
        name: String(name).trim(),
        surname: String(surname).trim(),
        position: String(position).trim(),
        salary: String(salary),
        bankAccount: bankAccount?.trim() || null,
        bankName: bankName?.trim() || null,
        mobileMoneyProvider: mobileMoneyProvider || 'none',
        mobileMoneyNumber: mobileMoneyNumber?.trim() || null,
      })
      .returning();
    return c.json({ employee: created }, 201);
  } catch (e) {
    const err = e as Error;
    if (err?.message === 'Ministry not found') {
      return c.json({ error: 'Ministry not found' }, 404);
    }
    console.error(e);
    return c.json({ error: 'Failed to create employee' }, 500);
  }
});

// Update employee (admin; position/salary for admin access)
route.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const body = await c.req.json() as Record<string, unknown>;
  const allowed = [
    'ministryId', 'departmentId', 'employeeNumber', 'name', 'surname', 'position', 'salary',
    'status', 'bankAccount', 'bankName', 'mobileMoneyProvider', 'mobileMoneyNumber',
    'fingerprintHash', 'faceHash',
  ];
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === 'status' && !['active', 'suspended', 'deceased', 'retired'].includes(body[key] as string)) continue;
      if (key === 'mobileMoneyProvider' && !['mpesa', 'airtel_money', 'orange_money', 'none'].includes(body[key] as string)) continue;
      update[key] = key === 'ministryId' || key === 'departmentId' ? (body[key] != null ? Number(body[key]) : null) : body[key];
    }
  }
  const [updated] = await db
    .update(employees)
    .set(update as typeof employees.$inferInsert)
    .where(eq(employees.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Employee not found' }, 404);
  return c.json({ employee: updated });
});

// Delete employee (admin)
route.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  await db.delete(employees).where(eq(employees.id, id));
  return c.json({ message: 'Employee deleted' });
});

export default route;

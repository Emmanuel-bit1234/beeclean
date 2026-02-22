import { Hono } from 'hono';
import { db } from '../db/connection.js';
import {
  payrollRuns,
  payrollRunSteps,
  employees,
  payslips,
} from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const PAYROLL_STEPS = [
  { order: 1, stepName: 'report_uploaded' },
  { order: 2, stepName: 'audit_approved' },
  { order: 3, stepName: 'auth_approved' },
  { order: 4, stepName: 'payment_done' },
  { order: 5, stepName: 'reconciled' },
] as const;

const route = new Hono<{ Variables: AuthVariables }>();

// List payroll runs (filter by period, status)
route.get('/', authMiddleware, async (c) => {
  const month = c.req.query('period_month');
  const year = c.req.query('period_year');
  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  let query = db.select().from(payrollRuns).orderBy(desc(payrollRuns.periodYear), desc(payrollRuns.periodMonth)).limit(limit).offset(offset);
  const conditions: ReturnType<typeof eq>[] = [];
  if (month) {
    const m = parseInt(month, 10);
    if (!isNaN(m)) conditions.push(eq(payrollRuns.periodMonth, m));
  }
  if (year) {
    const y = parseInt(year, 10);
    if (!isNaN(y)) conditions.push(eq(payrollRuns.periodYear, y));
  }
  if (status) conditions.push(eq(payrollRuns.status, status as typeof payrollRuns.$inferSelect.status));
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await (where
    ? db.select().from(payrollRuns).where(where).orderBy(desc(payrollRuns.periodYear), desc(payrollRuns.periodMonth)).limit(limit).offset(offset)
    : db.select().from(payrollRuns).orderBy(desc(payrollRuns.periodYear), desc(payrollRuns.periodMonth)).limit(limit).offset(offset));
  const totalResult = where
    ? await db.select({ count: sql<number>`count(*)::int` }).from(payrollRuns).where(where)
    : await db.select({ count: sql<number>`count(*)::int` }).from(payrollRuns);
  const total = totalResult[0]?.count ?? 0;
  return c.json({ payrollRuns: rows, total, limit, offset });
});

// Get one payroll run with steps
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id)).limit(1);
  if (!run) return c.json({ error: 'Payroll run not found' }, 404);
  const steps = await db.select().from(payrollRunSteps).where(eq(payrollRunSteps.payrollRunId, id)).orderBy(payrollRunSteps.stepOrder);
  return c.json({ payrollRun: run, steps });
});

// Create payroll run (draft)
route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as { periodMonth: number; periodYear: number; budgetTotal?: string | number };
    const { periodMonth, periodYear, budgetTotal } = body;
    if (periodMonth == null || periodYear == null) return c.json({ error: 'periodMonth and periodYear required' }, 400);
    const m = Number(periodMonth);
    const y = Number(periodYear);
    if (m < 1 || m > 12 || y < 2000) return c.json({ error: 'Invalid period' }, 400);
    const existing = await db.select().from(payrollRuns).where(and(eq(payrollRuns.periodMonth, m), eq(payrollRuns.periodYear, y))).limit(1);
    if (existing.length > 0) return c.json({ error: 'Payroll run for this period already exists' }, 409);
    const [created] = await db
      .insert(payrollRuns)
      .values({
        periodMonth: m,
        periodYear: y,
        status: 'draft',
        budgetTotal: budgetTotal != null ? String(budgetTotal) : null,
      })
      .returning();
    return c.json({ payrollRun: created }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to create payroll run' }, 500);
  }
});

// Advance step: report_uploaded → audit_pending → audit_approved → auth_pending → auth_approved → payment_pending → payment_done → reconciled
route.put('/:id/step', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const body = await c.req.json() as { stepName: string; payload?: Record<string, unknown> };
  const { stepName, payload } = body;
  const user = c.get('user');
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id)).limit(1);
  if (!run) return c.json({ error: 'Payroll run not found' }, 404);
  const stepDef = PAYROLL_STEPS.find((s) => s.stepName === stepName);
  if (!stepDef) return c.json({ error: 'Invalid stepName' }, 400);
  const [stepRow] = await db
    .select()
    .from(payrollRunSteps)
    .where(and(eq(payrollRunSteps.payrollRunId, id), eq(payrollRunSteps.stepName, stepName)))
    .limit(1);
  if (stepRow?.completedAt) return c.json({ error: 'Step already completed' }, 409);
  const statusMap: Record<string, typeof payrollRuns.$inferSelect.status> = {
    report_uploaded: 'report_uploaded',
    audit_approved: 'audit_approved',
    auth_approved: 'auth_approved',
    payment_done: 'payment_done',
    reconciled: 'reconciled',
  };
  const newStatus = statusMap[stepName] ?? run.status;
  await db.insert(payrollRunSteps).values({
    payrollRunId: id,
    stepOrder: stepDef.order,
    stepName: stepDef.stepName,
    completedAt: new Date(),
    completedByUserId: user.id,
    payload: payload ?? null,
  });
  const nextStatus =
    stepName === 'report_uploaded' ? 'audit_pending'
    : stepName === 'audit_approved' ? 'auth_pending'
    : stepName === 'auth_approved' ? 'payment_pending'
    : stepName === 'payment_done' ? 'payment_done'
    : 'reconciled';
  await db.update(payrollRuns).set({ status: newStatus, updatedAt: new Date() }).where(eq(payrollRuns.id, id));
  const [updated] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id)).limit(1);
  return c.json({ payrollRun: updated, stepCompleted: stepName });
});

// Generate payslips for a run (from active employees; admin)
route.post('/:id/generate-payslips', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id)).limit(1);
  if (!run) return c.json({ error: 'Payroll run not found' }, 404);
  const existing = await db.select({ employeeId: payslips.employeeId }).from(payslips).where(eq(payslips.payrollRunId, id));
  const existingIds = new Set(existing.map((e) => e.employeeId));
  const activeEmployees = await db.select().from(employees).where(eq(employees.status, 'active'));
  let created = 0;
  for (const emp of activeEmployees) {
    if (existingIds.has(emp.id)) continue;
    const salary = Number(emp.salary);
    const deductions = 0; // TODO: sum sanctions for period
    const net = salary - deductions;
    await db.insert(payslips).values({
      employeeId: emp.id,
      payrollRunId: id,
      gross: String(salary),
      deductions: String(deductions),
      net: String(net),
    });
    created++;
  }
  const list = await db.select().from(payslips).where(eq(payslips.payrollRunId, id));
  return c.json({ message: 'Payslips generated', count: list.length, created, payslips: list });
});

export default route;

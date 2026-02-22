import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { payslips, employees, payrollRuns, ministries } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const route = new Hono<{ Variables: AuthVariables }>();

// List payslips (payroll_run_id or employee_id)
route.get('/', authMiddleware, async (c) => {
  const payrollRunId = c.req.query('payroll_run_id');
  const employeeId = c.req.query('employee_id');
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 500);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  if (!payrollRunId && !employeeId) {
    return c.json({ error: 'Provide payroll_run_id or employee_id' }, 400);
  }
  const conditions: ReturnType<typeof eq>[] = [];
  if (payrollRunId) {
    const rid = parseInt(payrollRunId, 10);
    if (!isNaN(rid)) conditions.push(eq(payslips.payrollRunId, rid));
  }
  if (employeeId) {
    const eid = parseInt(employeeId, 10);
    if (!isNaN(eid)) conditions.push(eq(payslips.employeeId, eid));
  }
  const where = and(...conditions);
  const rows = await db
    .select({
      payslip: payslips,
      employeeName: employees.name,
      employeeSurname: employees.surname,
      employeeNumber: employees.employeeNumber,
      periodMonth: payrollRuns.periodMonth,
      periodYear: payrollRuns.periodYear,
    })
    .from(payslips)
    .leftJoin(employees, eq(payslips.employeeId, employees.id))
    .leftJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
    .where(where)
    .limit(limit)
    .offset(offset);
  return c.json({
    payslips: rows.map((r) => ({
      ...r.payslip,
      employeeName: r.employeeName,
      employeeSurname: r.employeeSurname,
      employeeNumber: r.employeeNumber,
      periodMonth: r.periodMonth,
      periodYear: r.periodYear,
    })),
  });
});

// Get one payslip
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [row] = await db
    .select({
      payslip: payslips,
      employee: employees,
      run: payrollRuns,
      ministryName: ministries.name,
    })
    .from(payslips)
    .leftJoin(employees, eq(payslips.employeeId, employees.id))
    .leftJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
    .leftJoin(ministries, eq(employees.ministryId, ministries.id))
    .where(eq(payslips.id, id))
    .limit(1);
  if (!row) return c.json({ error: 'Payslip not found' }, 404);
  return c.json({
    payslip: {
      ...row.payslip,
      employee: row.employee,
      periodMonth: row.run?.periodMonth,
      periodYear: row.run?.periodYear,
      ministryName: row.ministryName,
    },
  });
});

// Mark payslip as paid (admin / payment step)
route.put('/:id/paid', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [updated] = await db
    .update(payslips)
    .set({ paidAt: new Date() })
    .where(eq(payslips.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Payslip not found' }, 404);
  return c.json({ payslip: updated });
});

export default route;

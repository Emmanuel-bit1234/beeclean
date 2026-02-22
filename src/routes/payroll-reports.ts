import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { payrollReports, payrollRuns, ministries } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, desc } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const route = new Hono<{ Variables: AuthVariables }>();

const REPORT_TYPES = ['monthly', 'audit', 'authorisation', 'payment', 'reconciliation'] as const;

// List reports (filters: payroll_run_id, ministry_id, period_month, period_year, report_type)
route.get('/', authMiddleware, async (c) => {
  const payrollRunId = c.req.query('payroll_run_id');
  const ministryId = c.req.query('ministry_id');
  const periodMonth = c.req.query('period_month');
  const periodYear = c.req.query('period_year');
  const reportType = c.req.query('report_type');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

  const conditions: ReturnType<typeof eq>[] = [];
  if (payrollRunId) {
    const rid = parseInt(payrollRunId, 10);
    if (!isNaN(rid)) conditions.push(eq(payrollReports.payrollRunId, rid));
  }
  if (ministryId) {
    const mid = parseInt(ministryId, 10);
    if (!isNaN(mid)) conditions.push(eq(payrollReports.ministryId, mid));
  }
  if (periodMonth) {
    const m = parseInt(periodMonth, 10);
    if (!isNaN(m)) conditions.push(eq(payrollReports.periodMonth, m));
  }
  if (periodYear) {
    const y = parseInt(periodYear, 10);
    if (!isNaN(y)) conditions.push(eq(payrollReports.periodYear, y));
  }
  if (reportType && REPORT_TYPES.includes(reportType as typeof REPORT_TYPES[number])) {
    conditions.push(eq(payrollReports.reportType, reportType as typeof REPORT_TYPES[number]));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await (where
    ? db.select().from(payrollReports).where(where).orderBy(desc(payrollReports.createdAt)).limit(limit)
    : db.select().from(payrollReports).orderBy(desc(payrollReports.createdAt)).limit(limit));
  return c.json({ reports: rows });
});

// Get one report
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [row] = await db.select().from(payrollReports).where(eq(payrollReports.id, id)).limit(1);
  if (!row) return c.json({ error: 'Report not found' }, 404);
  return c.json({ report: row });
});

// Upload report (store file URL; actual file upload can be S3/local elsewhere)
route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      payrollRunId?: number;
      ministryId?: number;
      periodMonth: number;
      periodYear: number;
      reportType: typeof REPORT_TYPES[number];
      fileUrl?: string;
      fileName?: string;
    };
    const { payrollRunId, ministryId, periodMonth, periodYear, reportType, fileUrl, fileName } = body;
    if (periodMonth == null || periodYear == null || !reportType) {
      return c.json({ error: 'periodMonth, periodYear, reportType required' }, 400);
    }
    if (!REPORT_TYPES.includes(reportType)) return c.json({ error: 'Invalid reportType' }, 400);
    const user = c.get('user');
    const [created] = await db
      .insert(payrollReports)
      .values({
        payrollRunId: payrollRunId ?? null,
        ministryId: ministryId ?? null,
        periodMonth: Number(periodMonth),
        periodYear: Number(periodYear),
        reportType,
        fileUrl: fileUrl?.trim() || null,
        fileName: fileName?.trim() || null,
        uploadedByUserId: user.id,
      })
      .returning();
    return c.json({ report: created }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to create report' }, 500);
  }
});

export default route;

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
  // Exclude large base64 from list response; use GET /:id/file to download
  const reports = rows.map(({ fileContentBase64: _, ...r }) => r);
  return c.json({ reports });
});

// Download report file (by id) - returns file when stored as base64
route.get('/:id/file', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [row] = await db
    .select({ fileContentBase64: payrollReports.fileContentBase64, fileName: payrollReports.fileName })
    .from(payrollReports)
    .where(eq(payrollReports.id, id))
    .limit(1);
  if (!row?.fileContentBase64) return c.json({ error: 'Report file not found' }, 404);
  try {
    const buffer = Buffer.from(row.fileContentBase64, 'base64');
    const fileName = row.fileName || `report-${id}.pdf`;
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    return c.json({ error: 'Invalid file content' }, 500);
  }
});

// Get one report (excludes fileContentBase64; use GET /:id/file to download)
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [row] = await db.select().from(payrollReports).where(eq(payrollReports.id, id)).limit(1);
  if (!row) return c.json({ error: 'Report not found' }, 404);
  const { fileContentBase64: _, ...report } = row;
  return c.json({ report });
});

// Upload report file (multipart/form-data) - accepts file directly
route.post('/upload', authMiddleware, adminMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const payrollRunId = formData.get('payrollRunId');
    const ministryId = formData.get('ministryId');
    const periodMonth = formData.get('periodMonth');
    const periodYear = formData.get('periodYear');
    const reportType = formData.get('reportType');

    if (!file) return c.json({ error: 'File is required' }, 400);
    if (!periodMonth || !periodYear || !reportType) {
      return c.json({ error: 'periodMonth, periodYear, reportType required' }, 400);
    }
    if (!REPORT_TYPES.includes(reportType as typeof REPORT_TYPES[number])) {
      return c.json({ error: 'Invalid reportType' }, 400);
    }

    // TODO: Upload file to cloud storage (Vercel Blob, S3, Cloudinary, etc.)
    // For now, we'll store metadata and expect fileUrl to be provided separately
    // OR you can implement: const fileUrl = await uploadToStorage(file);
    
    // Example: If using Vercel Blob (uncomment and install @vercel/blob):
    // import { put } from '@vercel/blob';
    // const blob = await put(file.name, file, { access: 'public' });
    // const fileUrl = blob.url;

    // For now, return error asking for fileUrl or implement storage
    return c.json({ 
      error: 'File upload storage not configured. Please use POST /payroll-reports with fileUrl, or configure cloud storage (Vercel Blob, S3, etc.)' 
    }, 501);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to upload report file' }, 500);
  }
});

// Upload report: accepts either fileUrl (external) or fileBase64 + fileName (inline)
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
      fileBase64?: string;
    };
    const { payrollRunId, ministryId, periodMonth, periodYear, reportType, fileUrl, fileName, fileBase64 } = body;
    if (periodMonth == null || periodYear == null || !reportType) {
      return c.json({ error: 'periodMonth, periodYear, reportType required' }, 400);
    }
    if (!REPORT_TYPES.includes(reportType)) return c.json({ error: 'Invalid reportType' }, 400);
    if (fileBase64 != null && !fileName?.trim()) {
      return c.json({ error: 'fileName is required when fileBase64 is provided' }, 400);
    }
    const user = c.get('user');

    const fileContentBase64 = typeof fileBase64 === 'string' && fileBase64.trim() ? fileBase64.trim() : null;
    const finalFileName = fileName?.trim() || null;
    const finalFileUrl = fileUrl?.trim() || null;

    const [created] = await db
      .insert(payrollReports)
      .values({
        payrollRunId: payrollRunId ?? null,
        ministryId: ministryId ?? null,
        periodMonth: Number(periodMonth),
        periodYear: Number(periodYear),
        reportType,
        fileUrl: finalFileUrl,
        fileName: finalFileName,
        fileContentBase64,
        uploadedByUserId: user.id,
      })
      .returning();

    // When stored as base64, set fileUrl to the download path so frontend can use it
    if (fileContentBase64 && created && !finalFileUrl) {
      const baseUrl = new URL(c.req.url).origin;
      const downloadUrl = `${baseUrl}/payroll-reports/${created.id}/file`;
      await db
        .update(payrollReports)
        .set({ fileUrl: downloadUrl })
        .where(eq(payrollReports.id, created.id));
      const { fileContentBase64: _b, ...report } = { ...created, fileUrl: downloadUrl };
      return c.json({ report }, 201);
    }

    const { fileContentBase64: _b2, ...report } = created;
    return c.json({ report }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to create report' }, 500);
  }
});

export default route;

import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { excelUploads, ministries } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, desc } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const route = new Hono<{ Variables: AuthVariables }>();

// List uploads (ministry_id, upload_type, status)
route.get('/', authMiddleware, async (c) => {
  const ministryId = c.req.query('ministry_id');
  const uploadType = c.req.query('upload_type');
  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

  const conditions: ReturnType<typeof eq>[] = [];
  if (ministryId) {
    const mid = parseInt(ministryId, 10);
    if (!isNaN(mid)) conditions.push(eq(excelUploads.ministryId, mid));
  }
  if (uploadType) conditions.push(eq(excelUploads.uploadType, uploadType));
  if (status) conditions.push(eq(excelUploads.status, status));
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select({
      upload: excelUploads,
      ministryName: ministries.name,
    })
    .from(excelUploads)
    .leftJoin(ministries, eq(excelUploads.ministryId, ministries.id))
    .where(where)
    .orderBy(desc(excelUploads.uploadedAt))
    .limit(limit);
  return c.json({
    uploads: rows.map((r) => ({
      ...r.upload,
      ministryName: r.ministryName,
    })),
  });
});

// Get one upload
route.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const [row] = await db.select().from(excelUploads).where(eq(excelUploads.id, id)).limit(1);
  if (!row) return c.json({ error: 'Upload not found' }, 404);
  return c.json({ upload: row });
});

// Register upload (file stored elsewhere; we store metadata + optional fileUrl)
route.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json() as {
      fileName: string;
      fileUrl?: string;
      ministryId?: number;
      uploadType: string;
      rowsCount?: number;
    };
    const { fileName, fileUrl, ministryId, uploadType, rowsCount } = body;
    if (!fileName || !uploadType) return c.json({ error: 'fileName and uploadType required' }, 400);
    const user = c.get('user');
    const [created] = await db
      .insert(excelUploads)
      .values({
        fileName: String(fileName).trim(),
        fileUrl: fileUrl?.trim() || null,
        ministryId: ministryId != null ? Number(ministryId) : null,
        uploadType: String(uploadType).trim(),
        rowsCount: rowsCount != null ? Number(rowsCount) : 0,
        status: 'pending',
        uploadedByUserId: user.id,
      })
      .returning();
    return c.json({ upload: created }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Failed to register upload' }, 500);
  }
});

// Update status (e.g. after processing)
route.put('/:id/status', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const body = await c.req.json() as { status: string };
  if (!body.status) return c.json({ error: 'status required' }, 400);
  const [updated] = await db
    .update(excelUploads)
    .set({ status: String(body.status).trim() })
    .where(eq(excelUploads.id, id))
    .returning();
  if (!updated) return c.json({ error: 'Upload not found' }, 404);
  return c.json({ upload: updated });
});

export default route;

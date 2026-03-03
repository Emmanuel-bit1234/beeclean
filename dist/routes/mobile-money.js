import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { employees, ministries } from '../db/schema.js';
import { authMiddleware, adminMiddleware } from '../auth/middleware.js';
import { eq, and, ne } from 'drizzle-orm';
const route = new Hono();
const PROVIDERS = ['mpesa', 'airtel_money', 'orange_money'];
// List employees by mobile money provider (for M-Pesa, Airtel Money, etc.)
route.get('/by-provider', authMiddleware, async (c) => {
    const provider = c.req.query('provider');
    const ministryId = c.req.query('ministry_id');
    if (!provider || !PROVIDERS.includes(provider)) {
        return c.json({ error: 'provider required: mpesa | airtel_money | orange_money' }, 400);
    }
    const conditions = [eq(employees.mobileMoneyProvider, provider)];
    if (ministryId) {
        const mid = parseInt(ministryId, 10);
        if (!isNaN(mid))
            conditions.push(eq(employees.ministryId, mid));
    }
    const rows = await db
        .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        name: employees.name,
        surname: employees.surname,
        mobileMoneyProvider: employees.mobileMoneyProvider,
        mobileMoneyNumber: employees.mobileMoneyNumber,
        salary: employees.salary,
        ministryName: ministries.name,
    })
        .from(employees)
        .leftJoin(ministries, eq(employees.ministryId, ministries.id))
        .where(and(...conditions));
    return c.json({ employees: rows, provider });
});
// List employees with mobile money (no bank or using mobile money)
route.get('/no-bank', authMiddleware, async (c) => {
    const ministryId = c.req.query('ministry_id');
    const conditions = [ne(employees.mobileMoneyProvider, 'none')];
    if (ministryId) {
        const mid = parseInt(ministryId, 10);
        if (!isNaN(mid))
            conditions.push(eq(employees.ministryId, mid));
    }
    const rows = await db
        .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        name: employees.name,
        surname: employees.surname,
        bankAccount: employees.bankAccount,
        mobileMoneyProvider: employees.mobileMoneyProvider,
        mobileMoneyNumber: employees.mobileMoneyNumber,
        ministryName: ministries.name,
    })
        .from(employees)
        .leftJoin(ministries, eq(employees.ministryId, ministries.id))
        .where(and(...conditions));
    return c.json({ employees: rows });
});
// Bulk update mobile money (admin) – e.g. set provider + number for many employees
route.post('/bulk-update', authMiddleware, adminMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const { updates } = body;
        if (!Array.isArray(updates) || updates.length === 0) {
            return c.json({ error: 'updates array required' }, 400);
        }
        let done = 0;
        for (const u of updates) {
            if (!u.employeeId || !u.provider || !PROVIDERS.includes(u.provider))
                continue;
            await db
                .update(employees)
                .set({
                mobileMoneyProvider: u.provider,
                mobileMoneyNumber: u.mobileMoneyNumber?.trim() || null,
                updatedAt: new Date(),
            })
                .where(eq(employees.id, u.employeeId));
            done++;
        }
        return c.json({ message: 'Bulk update completed', updated: done });
    }
    catch (e) {
        console.error(e);
        return c.json({ error: 'Bulk update failed' }, 500);
    }
});
export default route;

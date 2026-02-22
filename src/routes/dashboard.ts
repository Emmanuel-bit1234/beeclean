import { Hono } from 'hono';
import { db } from '../db/connection.js';
import {
  employees,
  budgets,
  payrollRuns,
  employeeVerifications,
  ministries,
  payslips,
  messages,
} from '../db/schema.js';
import { authMiddleware } from '../auth/middleware.js';
import { eq, and, sql, inArray, isNotNull, or } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';

const route = new Hono<{ Variables: AuthVariables }>();

// GET /dashboard – stats for Tableau de bord (Total Employés, Budget, Paies Actives, Vérifications, etc.)
route.get('/', authMiddleware, async (c) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Total employees (active only for "total employés")
    const [employeeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(eq(employees.status, 'active'));
    const totalEmployees = employeeCount?.count ?? 0;

    // Total budget: sum of current month budgets
    const budgetRows = await db
      .select({ amount: budgets.amount })
      .from(budgets)
      .where(and(eq(budgets.periodMonth, currentMonth), eq(budgets.periodYear, currentYear)));
    const totalBudget = budgetRows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

    // Total spent: payslips from current period where run is payment_done/reconciled OR payslip has paid_at set
    const spentStatuses = ['payment_done', 'reconciled'] as const;
    const paidThisMonth = await db
      .select({ net: payslips.net })
      .from(payslips)
      .innerJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
      .where(
        and(
          eq(payrollRuns.periodMonth, currentMonth),
          eq(payrollRuns.periodYear, currentYear),
          or(isNotNull(payslips.paidAt), inArray(payrollRuns.status, spentStatuses))
        )
      );
    const totalSpent = paidThisMonth.reduce((sum, r) => sum + Number(r.net ?? 0), 0);

    // Active payrolls: runs not draft and not reconciled
    const activeStatuses = [
      'report_uploaded',
      'audit_pending',
      'audit_approved',
      'auth_pending',
      'auth_approved',
      'payment_pending',
      'payment_done',
    ] as const;
    const [activePayrollsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payrollRuns)
      .where(inArray(payrollRuns.status, activeStatuses));
    const activePayrolls = activePayrollsCount?.count ?? 0;

    // Pending verifications
    const [pendingVerifCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeeVerifications)
      .where(eq(employeeVerifications.status, 'pending'));
    const pendingVerifications = pendingVerifCount?.count ?? 0;

    // Unread messages
    const [unreadMessagesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(sql`${messages.readAt} IS NULL`);
    const unreadMessages = unreadMessagesCount?.count ?? 0;

    // Upcoming payments: ministries with payment day this/next month, budget amount, employee count
    const ministryList = await db.select().from(ministries).orderBy(ministries.paymentDayOfMonth);
    const upcomingPayments: Array<{
      ministryName: string;
      ministryId: number;
      paymentDay: number;
      paymentDate: string;
      employeeCount: number;
      amountFC: string;
    }> = [];

    for (const m of ministryList) {
      const [empCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(employees)
        .where(and(eq(employees.ministryId, m.id), eq(employees.status, 'active')));
      const budgetRow = await db
        .select({ amount: budgets.amount })
        .from(budgets)
        .where(
          and(
            eq(budgets.ministryId, m.id),
            eq(budgets.periodMonth, currentMonth),
            eq(budgets.periodYear, currentYear)
          )
        )
        .limit(1);
      const amount = budgetRow[0]?.amount ?? '0';
      const day = m.paymentDayOfMonth;
      const paymentDate = `${day} ${getMonthName(currentMonth)}`;
      upcomingPayments.push({
        ministryName: m.name,
        ministryId: m.id,
        paymentDay: day,
        paymentDate,
        employeeCount: empCount?.count ?? 0,
        amountFC: String(amount),
      });
    }
    // Sort by payment day and take next 5–10
    upcomingPayments.sort((a, b) => a.paymentDay - b.paymentDay);

    // Recent activities: last payroll run steps (completed) or last paid payslips
    const recentSteps = await db
      .select({
        id: payrollRuns.id,
        periodMonth: payrollRuns.periodMonth,
        periodYear: payrollRuns.periodYear,
        status: payrollRuns.status,
        updatedAt: payrollRuns.updatedAt,
      })
      .from(payrollRuns)
      .orderBy(sql`${payrollRuns.updatedAt} DESC`)
      .limit(5);
    const recentActivities = recentSteps.map((r) => ({
      type: 'payroll_run',
      label: `Paie ${getMonthName(r.periodMonth)} ${r.periodYear}`,
      status: r.status,
      at: r.updatedAt,
    }));

    return c.json({
      totalEmployees,
      totalBudget: String(totalBudget),
      totalBudgetSpent: String(totalSpent),
      activePayrolls,
      pendingVerifications,
      unreadMessages,
      upcomingPayments,
      recentActivities,
      systemStatus: {
        workflowActive: activePayrolls > 0,
        verificationsPending: pendingVerifications,
        messagesUnread: unreadMessages,
      },
    });
  } catch (e) {
    console.error('Dashboard error:', e);
    return c.json(
      {
        error: 'Failed to load dashboard',
        totalEmployees: 0,
        totalBudget: '0',
        totalBudgetSpent: '0',
        activePayrolls: 0,
        pendingVerifications: 0,
        unreadMessages: 0,
        upcomingPayments: [],
        recentActivities: [],
      },
      500
    );
  }
});

function getMonthName(month: number): string {
  const names = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  return names[month - 1] ?? '';
}

export default route;

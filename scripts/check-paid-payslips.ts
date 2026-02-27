/**
 * One-off script to verify why totalBudgetSpent might be 0.
 * Run: pnpm exec tsx scripts/check-paid-payslips.ts
 */
import 'dotenv/config';
import { db } from '../src/db/connection.js';
import { payrollRuns, payslips } from '../src/db/schema.js';
import { and, eq, isNotNull, sql, inArray } from 'drizzle-orm';

async function main() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  console.log('--- Dashboard uses (current period) ---');
  console.log({ currentMonth, currentYear });
  console.log('');

  console.log('--- All payroll runs ---');
  const runs = await db.select().from(payrollRuns).orderBy(payrollRuns.id);
  console.table(runs.map((r) => ({
    id: r.id,
    periodMonth: r.periodMonth,
    periodYear: r.periodYear,
    status: r.status,
  })));
  console.log('');

  console.log('--- All payslips (sample: id, payrollRunId, net, paidAt) ---');
  const allSlips = await db.select({
    id: payslips.id,
    payrollRunId: payslips.payrollRunId,
    net: payslips.net,
    paidAt: payslips.paidAt,
  }).from(payslips).limit(20);
  console.log('Total payslips in DB:', (await db.select({ n: sql<number>`count(*)::int` }).from(payslips))[0]?.n ?? 0);
  if (allSlips.length > 0) console.table(allSlips);
  console.log('');

  console.log('--- Payslips with paid_at set (any run) ---');
  const paidSlips = await db
    .select({
      id: payslips.id,
      payrollRunId: payslips.payrollRunId,
      net: payslips.net,
      paidAt: payslips.paidAt,
    })
    .from(payslips)
    .where(isNotNull(payslips.paidAt));
  console.log('Count:', paidSlips.length);
  if (paidSlips.length > 0) {
    console.table(paidSlips);
    const sumNet = paidSlips.reduce((s, r) => s + Number(r.net ?? 0), 0);
    console.log('Sum of net (all paid payslips):', sumNet);
  }
  console.log('');

  console.log('--- Payslips that COUNT toward totalBudgetSpent ---');
  console.log('(paid_at IS NOT NULL AND run.periodMonth = currentMonth AND run.periodYear = currentYear)');
  const paidThisMonth = await db
    .select({ net: payslips.net, runId: payrollRuns.id, periodMonth: payrollRuns.periodMonth, periodYear: payrollRuns.periodYear })
    .from(payslips)
    .innerJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
    .where(
      and(
        eq(payrollRuns.periodMonth, currentMonth),
        eq(payrollRuns.periodYear, currentYear),
        isNotNull(payslips.paidAt)
      )
    );
  console.log('Count:', paidThisMonth.length);
  if (paidThisMonth.length > 0) {
    console.table(paidThisMonth);
    const totalSpent = paidThisMonth.reduce((sum, r) => sum + Number(r.net ?? 0), 0);
    console.log('totalBudgetSpent would be:', totalSpent);
  } else {
    console.log('No payslips match → totalBudgetSpent = 0');
  }

  console.log('');
  console.log('--- Dashboard totalBudgetSpent (CURRENT CODE) ---');
  console.log('(sum of payroll_runs.budgetTotal for current period where status is payment_done or reconciled)');
  const spentStatuses = ['payment_done', 'reconciled'] as const;
  const spentRuns = await db
    .select({
      id: payrollRuns.id,
      status: payrollRuns.status,
      budgetTotal: payrollRuns.budgetTotal,
      periodMonth: payrollRuns.periodMonth,
      periodYear: payrollRuns.periodYear,
    })
    .from(payrollRuns)
    .where(
      and(
        eq(payrollRuns.periodMonth, currentMonth),
        eq(payrollRuns.periodYear, currentYear),
        inArray(payrollRuns.status, spentStatuses)
      )
    );
  console.log('Count:', spentRuns.length);
  if (spentRuns.length > 0) {
    console.table(spentRuns);
    const totalBudgetSpent = spentRuns.reduce((s, r) => s + Number(r.budgetTotal ?? 0), 0);
    console.log('totalBudgetSpent (dashboard) would be:', totalBudgetSpent);
  } else {
    console.log('No runs match → totalBudgetSpent (dashboard) = 0');
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

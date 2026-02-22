import 'dotenv/config';
import { db } from '../src/db/connection.js';
import {
  ministries,
  departments,
  employees,
  users,
  budgets,
  payrollRuns,
  messages,
  sanctions,
} from '../src/db/schema.js';
import { hashPassword } from '../src/auth/utils.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...\n');

  // ─── 1. Admin user (for CRUD) ─────────────────────────────────────────────
  const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@payroll.rdc.gov')).limit(1);
  if (existingAdmin.length === 0) {
    const passwordHash = await hashPassword('Admin123!');
    await db.insert(users).values({
      email: 'admin@payroll.rdc.gov',
      passwordHash,
      name: 'Admin',
      surname: 'Payroll',
      role: 'Admin',
    });
    console.log('✅ Admin user: admin@payroll.rdc.gov / Admin123!');
  } else {
    console.log('⏭️  Admin user already exists');
  }

  // ─── 2. Ministries ────────────────────────────────────────────────────────
  const ministryRows = await db.select().from(ministries).limit(1);
  if (ministryRows.length === 0) {
    await db.insert(ministries).values([
      { name: 'Ministère des Finances', code: 'FIN', sectorCategory: 'Finances / Économie', paymentDayOfMonth: 25 },
      { name: 'Ministère du Budget', code: 'BUD', sectorCategory: 'Finances / Économie', paymentDayOfMonth: 24 },
      { name: 'Ministère de la Fonction Publique', code: 'FONC', sectorCategory: 'Travail / Fonction Publique', paymentDayOfMonth: 23 },
      { name: 'Ministère de l\'Emploi et Travail', code: 'EMP', sectorCategory: 'Travail / Fonction Publique', paymentDayOfMonth: 22 },
      { name: 'Défense Nationale', code: 'DEF', sectorCategory: 'Souveraineté / Sécurité', paymentDayOfMonth: 28 },
      { name: 'Santé Publique', code: 'SANT', sectorCategory: 'Secteurs Sociaux', paymentDayOfMonth: 20 },
    ]);
    console.log('✅ Ministries: 6 inserted');
  } else {
    console.log('⏭️  Ministries already seeded');
  }

  // Get ministry IDs for departments and employees
  const allMinistries = await db.select({ id: ministries.id, code: ministries.code }).from(ministries);
  const fin = allMinistries.find((m) => m.code === 'FIN');
  const bud = allMinistries.find((m) => m.code === 'BUD');
  const fonc = allMinistries.find((m) => m.code === 'FONC');
  const emp = allMinistries.find((m) => m.code === 'EMP');
  if (!fin || !bud || !fonc || !emp) {
    console.log('⚠️  Run ministries seed first (or db:push). Skipping departments/employees.');
  }

  // ─── 3. Departments ──────────────────────────────────────────────────────
  const deptRows = await db.select().from(departments).limit(1);
  if (deptRows.length === 0 && fin && bud && fonc && emp) {
    await db.insert(departments).values([
      { ministryId: fin.id, name: 'Direction du Budget', code: 'FIN-DB', budgetMonthly: '50000000' },
      { ministryId: fin.id, name: 'Direction de la Paie', code: 'FIN-DP', budgetMonthly: '30000000' },
      { ministryId: bud.id, name: 'Secrétariat Général', code: 'BUD-SG', budgetMonthly: '25000000' },
      { ministryId: fonc.id, name: 'Ressources Humaines', code: 'FONC-RH', budgetMonthly: '20000000' },
      { ministryId: emp.id, name: 'Emploi', code: 'EMP-EMP', budgetMonthly: '15000000' },
    ]);
    console.log('✅ Departments: 5 inserted');
  } else {
    console.log('⏭️  Departments already seeded');
  }

  const allDepts = await db.select({ id: departments.id, code: departments.code }).from(departments);
  const finDb = allDepts.find((d) => d.code === 'FIN-DB');
  const finDp = allDepts.find((d) => d.code === 'FIN-DP');

  // ─── 4. Employees ───────────────────────────────────────────────────────
  const empRows = await db.select().from(employees).limit(1);
  if (empRows.length === 0 && fin && bud && fonc && finDb && finDp) {
    await db.insert(employees).values([
      { ministryId: fin.id, departmentId: finDb.id, employeeNumber: 'EMP-001', name: 'Jean', surname: 'Kabongo', position: 'Directeur de la Paie', salary: '5000', bankAccount: '1234567890', bankName: 'Rawbank' },
      { ministryId: fin.id, departmentId: finDp.id, employeeNumber: 'EMP-002', name: 'Marie', surname: 'Lubala', position: 'Chef de Division', salary: '3500', bankAccount: '0987654321', bankName: 'Equity BCDC' },
      { ministryId: fin.id, departmentId: finDp.id, employeeNumber: 'EMP-003', name: 'Paul', surname: 'Mutombo', position: 'Agent', salary: '1200', mobileMoneyProvider: 'mpesa', mobileMoneyNumber: '+243812345678' },
      { ministryId: bud.id, employeeNumber: 'EMP-004', name: 'Grace', surname: 'Tshilombo', position: 'Directeur du Budget', salary: '4800', bankAccount: '1122334455', bankName: 'Rawbank' },
      { ministryId: bud.id, employeeNumber: 'EMP-005', name: 'André', surname: 'Kabasele', position: 'Agent', salary: '1100', mobileMoneyProvider: 'airtel_money', mobileMoneyNumber: '+243998877665' },
      { ministryId: fonc.id, employeeNumber: 'EMP-006', name: 'Claudine', surname: 'Mbala', position: 'Secrétaire Générale adjointe', salary: '4200', bankAccount: '5544332211', bankName: 'Equity BCDC' },
      { ministryId: emp.id, employeeNumber: 'EMP-007', name: 'Joseph', surname: 'Ilunga', position: 'Agent', salary: '1000', mobileMoneyProvider: 'orange_money', mobileMoneyNumber: '+243900111222' },
    ]);
    console.log('✅ Employees: 7 inserted');
  } else {
    console.log('⏭️  Employees already seeded');
  }

  const allEmployees = await db.select({ id: employees.id, employeeNumber: employees.employeeNumber }).from(employees);
  const emp1 = allEmployees.find((e) => e.employeeNumber === 'EMP-001');
  const emp3 = allEmployees.find((e) => e.employeeNumber === 'EMP-003');

  // ─── 5. Budgets (current month) ───────────────────────────────────────────
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const budgetRows = await db.select().from(budgets).where(eq(budgets.periodMonth, month)).limit(1);
  if (budgetRows.length === 0 && fin && bud && fonc && emp) {
    await db.insert(budgets).values([
      { ministryId: fin.id, periodMonth: month, periodYear: year, amount: '300000000' },
      { ministryId: bud.id, periodMonth: month, periodYear: year, amount: '150000000' },
      { ministryId: fonc.id, periodMonth: month, periodYear: year, amount: '120000000' },
      { ministryId: emp.id, periodMonth: month, periodYear: year, amount: '80000000' },
    ]);
    console.log('✅ Budgets: 4 inserted (current month)');
  } else {
    console.log('⏭️  Budgets already seeded');
  }

  // ─── 6. Payroll run (draft) ──────────────────────────────────────────────
  const runRows = await db.select().from(payrollRuns).where(eq(payrollRuns.periodMonth, month)).limit(1);
  if (runRows.length === 0) {
    await db.insert(payrollRuns).values({
      periodMonth: month,
      periodYear: year,
      status: 'draft',
      budgetTotal: '650000000',
    });
    console.log('✅ Payroll run: 1 draft inserted');
  } else {
    console.log('⏭️  Payroll run already exists');
  }

  // ─── 7. Messages (pay notification, promotion) ───────────────────────────
  const msgRows = await db.select().from(messages).limit(1);
  if (msgRows.length === 0 && emp1 && emp3) {
    await db.insert(messages).values([
      { employeeId: emp1.id, type: 'pay_notification', title: 'Paiement du mois', body: 'Vous serez payé le 25 de ce mois. Montant net: 5000 USD.' },
      { employeeId: emp3.id, type: 'promotion', title: 'Félicitations', body: 'Vous avez été promu au grade supérieur. Nouveau salaire à partir du prochain mois.' },
    ]);
    console.log('✅ Messages: 2 inserted');
  } else {
    console.log('⏭️  Messages already seeded');
  }

  // ─── 8. Sanction (one deduction) ─────────────────────────────────────────
  const sancRows = await db.select().from(sanctions).limit(1);
  if (sancRows.length === 0 && emp3) {
    await db.insert(sanctions).values({
      employeeId: emp3.id,
      type: 'deduction',
      amountDeduction: '50',
      reason: 'Retard non justifié (janvier 2026)',
    });
    console.log('✅ Sanctions: 1 inserted');
  } else {
    console.log('⏭️  Sanctions already seeded');
  }

  console.log('\n✨ Seed complete. You can now:');
  console.log('  - Login: POST /auth/login with admin@payroll.rdc.gov / Admin123!');
  console.log('  - List ministries: GET /ministries');
  console.log('  - List employees: GET /employees');
  console.log('  - Add employee: POST /employees (with Bearer token, Admin role)');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

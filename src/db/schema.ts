import {
  pgTable,
  serial,
  varchar,
  timestamp,
  integer,
  decimal,
  text,
  date,
  pgEnum,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { RdcPayrollRole } from '../types/roles.js';

// ─── Enums ─────────────────────────────────────────────────────────────────
export const employeeStatusEnum = pgEnum('employee_status', [
  'active',
  'suspended',
  'deceased',
  'retired',
]);
export const verificationStepStatusEnum = pgEnum('verification_step_status', [
  'pending',
  'approved',
  'rejected',
]);
export const payrollRunStatusEnum = pgEnum('payroll_run_status', [
  'draft',
  'report_uploaded',
  'audit_pending',
  'audit_approved',
  'auth_pending',
  'auth_approved',
  'payment_pending',
  'payment_done',
  'reconciled',
]);
export const reportTypeEnum = pgEnum('report_type', [
  'monthly',
  'audit',
  'authorisation',
  'payment',
  'reconciliation',
]);
export const messageTypeEnum = pgEnum('message_type', [
  'pay_notification',
  'sanction',
  'promotion',
  'deduction',
  'general',
]);
export const mobileMoneyProviderEnum = pgEnum('mobile_money_provider', [
  'mpesa',
  'airtel_money',
  'orange_money',
  'none',
]);

// ─── Users (existing) ─────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  surname: varchar('surname', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('Agent').$type<RdcPayrollRole>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Ministries (RDC structure: Souveraineté, Finances, Travail, etc.) ───────
export const ministries = pgTable('ministries', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  sectorCategory: varchar('sector_category', { length: 100 }).notNull(), // Souveraineté, Finances, Travail, etc.
  paymentDayOfMonth: integer('payment_day_of_month').notNull(), // e.g. 23
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Departments (under ministry: Directeurs, Divisions, Bureaux) ──────────
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  ministryId: integer('ministry_id')
    .notNull()
    .references(() => ministries.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  budgetMonthly: decimal('budget_monthly', { precision: 18, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Employees (state DB: position, salary, bank/mobile money) ─────────────
export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  ministryId: integer('ministry_id')
    .notNull()
    .references(() => ministries.id, { onDelete: 'restrict' }),
  departmentId: integer('department_id').references(() => departments.id, { onDelete: 'set null' }),
  employeeNumber: varchar('employee_number', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  surname: varchar('surname', { length: 255 }).notNull(),
  position: varchar('position', { length: 255 }).notNull(),
  salary: decimal('salary', { precision: 18, scale: 2 }).notNull(),
  status: employeeStatusEnum('status').notNull().default('active'),
  bankAccount: varchar('bank_account', { length: 100 }),
  bankName: varchar('bank_name', { length: 100 }),
  mobileMoneyProvider: mobileMoneyProviderEnum('mobile_money_provider').default('none'),
  mobileMoneyNumber: varchar('mobile_money_number', { length: 50 }),
  fingerprintHash: varchar('fingerprint_hash', { length: 255 }),
  faceHash: varchar('face_hash', { length: 255 }),
  verifiedAt: timestamp('verified_at'),
  verifiedByUserId: integer('verified_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Employee verifications (step-by-step validation, fingerprint) ──────────
export const employeeVerifications = pgTable('employee_verifications', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  step: varchar('step', { length: 100 }).notNull(), // e.g. identity_check, position_confirmation
  verifiedByUserId: integer('verified_by_user_id').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  fingerprintUsed: boolean('fingerprint_used').default(false),
  status: verificationStepStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Payroll runs (monthly cycle: report → audit → auth → payment → reconcile) ─
export const payrollRuns = pgTable('payroll_runs', {
  id: serial('id').primaryKey(),
  periodMonth: integer('period_month').notNull(),
  periodYear: integer('period_year').notNull(),
  status: payrollRunStatusEnum('status').notNull().default('draft'),
  budgetTotal: decimal('budget_total', { precision: 18, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Payroll run steps (audit by Budget, auth by Finance, etc.) ────────────
export const payrollRunSteps = pgTable('payroll_run_steps', {
  id: serial('id').primaryKey(),
  payrollRunId: integer('payroll_run_id')
    .notNull()
    .references(() => payrollRuns.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  stepName: varchar('step_name', { length: 100 }).notNull(),
  completedAt: timestamp('completed_at'),
  completedByUserId: integer('completed_by_user_id').references(() => users.id),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Payroll reports (PDFs: monthly, audit, authorisation, payment, reconciliation) ─
export const payrollReports = pgTable('payroll_reports', {
  id: serial('id').primaryKey(),
  payrollRunId: integer('payroll_run_id').references(() => payrollRuns.id, { onDelete: 'cascade' }),
  ministryId: integer('ministry_id').references(() => ministries.id),
  periodMonth: integer('period_month').notNull(),
  periodYear: integer('period_year').notNull(),
  reportType: reportTypeEnum('report_type').notNull(),
  fileUrl: varchar('file_url', { length: 512 }),
  fileName: varchar('file_name', { length: 255 }),
  uploadedByUserId: integer('uploaded_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Budgets (per ministry/department, monthly) ────────────────────────────
export const budgets = pgTable('budgets', {
  id: serial('id').primaryKey(),
  ministryId: integer('ministry_id')
    .notNull()
    .references(() => ministries.id, { onDelete: 'cascade' }),
  departmentId: integer('department_id').references(() => departments.id),
  periodMonth: integer('period_month').notNull(),
  periodYear: integer('period_year').notNull(),
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  allocatedAt: timestamp('allocated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Payslips ──────────────────────────────────────────────────────────────
export const payslips = pgTable('payslips', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  payrollRunId: integer('payroll_run_id')
    .notNull()
    .references(() => payrollRuns.id, { onDelete: 'cascade' }),
  gross: decimal('gross', { precision: 18, scale: 2 }).notNull(),
  deductions: decimal('deductions', { precision: 18, scale: 2 }).notNull().default('0'),
  net: decimal('net', { precision: 18, scale: 2 }).notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Messages (pay day, sanction, promotion, deduction) ────────────────────
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  type: messageTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Sanctions (deductions, suspensions) ───────────────────────────────────
export const sanctions = pgTable('sanctions', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // suspension, deduction, etc.
  amountDeduction: decimal('amount_deduction', { precision: 18, scale: 2 }).default('0'),
  reason: text('reason').notNull(),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Excel uploads (bulk data) ──────────────────────────────────────────────
export const excelUploads = pgTable('excel_uploads', {
  id: serial('id').primaryKey(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 512 }),
  ministryId: integer('ministry_id').references(() => ministries.id),
  uploadType: varchar('upload_type', { length: 50 }).notNull(), // employees, payslips, etc.
  rowsCount: integer('rows_count').default(0),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  uploadedByUserId: integer('uploaded_by_user_id').references(() => users.id),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// ─── Relations ─────────────────────────────────────────────────────────────
export const ministriesRelations = relations(ministries, ({ many }) => ({
  departments: many(departments),
  employees: many(employees),
  budgets: many(budgets),
  payrollReports: many(payrollReports),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  ministry: one(ministries),
  employees: many(employees),
  budgets: many(budgets),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  ministry: one(ministries),
  department: one(departments),
  user: one(users),
  verifications: many(employeeVerifications),
  payslips: many(payslips),
  messages: many(messages),
  sanctions: many(sanctions),
}));

export const employeeVerificationsRelations = relations(employeeVerifications, ({ one }) => ({
  employee: one(employees),
  verifiedByUser: one(users),
}));

export const payrollRunsRelations = relations(payrollRuns, ({ many }) => ({
  steps: many(payrollRunSteps),
  reports: many(payrollReports),
  payslips: many(payslips),
}));

export const payrollRunStepsRelations = relations(payrollRunSteps, ({ one }) => ({
  payrollRun: one(payrollRuns),
  completedByUser: one(users),
}));

export const payrollReportsRelations = relations(payrollReports, ({ one }) => ({
  payrollRun: one(payrollRuns),
  ministry: one(ministries),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  ministry: one(ministries),
  department: one(departments),
}));

export const payslipsRelations = relations(payslips, ({ one }) => ({
  employee: one(employees),
  payrollRun: one(payrollRuns),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  employee: one(employees),
}));

export const sanctionsRelations = relations(sanctions, ({ one }) => ({
  employee: one(employees),
  createdByUser: one(users),
}));

// ─── Types ─────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Ministry = typeof ministries.$inferSelect;
export type NewMinistry = typeof ministries.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type EmployeeVerification = typeof employeeVerifications.$inferSelect;
export type NewEmployeeVerification = typeof employeeVerifications.$inferInsert;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type NewPayrollRun = typeof payrollRuns.$inferInsert;
export type PayrollRunStep = typeof payrollRunSteps.$inferSelect;
export type PayrollReport = typeof payrollReports.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Sanction = typeof sanctions.$inferSelect;
export type ExcelUpload = typeof excelUploads.$inferSelect;


# RDC Government Payroll System – API & Design

**Meeting with Andy – 11 Feb 2026**

This document describes the **Government Payroll System** for the DRC (RDC): scope, ministries structure, payroll flow, and the REST APIs implemented in this backend.

---

## 1. Overview

- **Target:** Government or subcontractor; can be sold to the state.
- **Stakeholders:** 3 key ministries:
  - **Ministère de l’Emploi**
  - **Ministère du Budget** (releases funds, payroll audit)
  - **Ministère des Finances** (releases funds, payroll authorisation, works with bank for payments)
- **Flow:** Collect funds → load into system → run approvals → execute all payments.
- **Bank:** Holds state account; can receive all customers; e.g. **$0.50 per employee** commission.
- **Approvals:** Multi-level (report → audit → authorisation → payment → reconciliation).

---

## 1.1 Quick start & dummy data

Ensure the database schema is applied (`pnpm db:push`), then seed dummy data:

```bash
pnpm db:seed
```

This creates:

- **Admin user:** `admin@payroll.rdc.gov` / `Admin123!` (use for CRUD)
- **6 ministries** (Finances, Budget, Fonction Publique, Emploi, Défense, Santé)
- **5 departments** (Direction du Budget, Direction de la Paie, etc.)
- **7 employees** (mix of bank and mobile money)
- **4 budgets** (current month), **1 payroll run** (draft), **2 messages**, **1 sanction**

**Test CRUD:**

1. Login: `POST /auth/login` with `{ "email": "admin@payroll.rdc.gov", "password": "Admin123!" }`
2. Use the returned `token` in the `Authorization: Bearer <token>` header.
3. List ministries: `GET /ministries`
4. List employees: `GET /employees`
5. Add employee: `POST /employees` with body e.g. `{ "ministryId": 1, "employeeNumber": "EMP-020", "name": "Jean", "surname": "Dupont", "position": "Agent", "salary": "1200" }`

---

## 2. Core Modules

### 2.1 Employee Verification

- **State DB:** Single database of all state employees.
- **Validation:** Done by the ministry; verification modules in ministry locations.
- **Biometrics (concept):** Fingerprint and/or face for “who added what” and approval (e.g. approve via fingerprint). Each step has its own validation.
- **API:** Steps (e.g. identity check, position confirmation) can be created and then approved/rejected (with optional `fingerprintUsed` flag for future biometric integration).

### 2.2 Position & Salary Confirmation

- **Admin access:** Authorized users can manage **position** and **salary** (and related admin fields).
- **Employee detail:** Opening a person shows **position** and **salary** (and ministry/department).
- **Hierarchy (RDC):**
  - **Pouvoirs:** Le Pouvoir Exécutif, Législatif, Judiciaire, Cour Constitutionnelle.
  - **Hiérarchie:** Président → Premier Ministre → VPM → Ministres d’État → Ministres → Ministres Délégués → Vice-Ministres.
  - **Inside each ministry:** Ministre, Vice-Ministre, Directeur de Cabinet, Secrétaire Général, Directeurs (Budget, RH, Paie, Informatique, etc.), Chefs de Division/Bureau, Agents.

### 2.3 Monthly Reports & Data Collection

- Reports (including suspensions, deducted payments, death cases, etc.) are produced and stored (e.g. PDFs linked via `fileUrl`).
- Each **department** can have its own **payment day** (e.g. Souveraineté/Sécurité 25M on the 23rd).
- **State account** is linked to the system; money is loaded and then paid per schedule.
- **Sector budgets:** Each sector has its own monthly budget and employees under that umbrella.

### 2.4 Messaging

- **Pay day:** Message to each employee: “You will get paid today” + amount.
- **Events:** Sanctions, promotions, deductions → notification messages per employee.

### 2.5 Payroll Processing Flow (6 steps + reconciliation)

1. **Report** – Monthly report (e.g. PDF) uploaded and accepted before processing starts.
2. **Payroll Audit** – Ministry of Budget checks that the report is correct.
3. **Payroll Authorisation** – Ministry of Finance authorises.
4. **Salary payment** – Bank (with Ministry of Finance) executes payments.
5. **Green light** – System marks run as ready / payment done.
6. **Post-payment report** – Payroll reporting that closes and must match the budget.
7. **Reconciliation** – Final reconciliation step.
8. **Corrections** – e.g. tax adjustments; difference appears in budget and can be returned to the bank.

### 2.6 Mobile Money (M-Pesa, Airtel Money, etc.)

- Employees without a bank account can be registered with **mobile money** (provider + number).
- APIs support listing by provider and bulk-updating mobile money details.

### 2.7 Excel Uploads

- Excel files can be uploaded (metadata stored; file stored elsewhere). Used for bulk data (e.g. employees, payslips).

---

## 3. RDC Ministry Structure (Reference)

### Sectors (examples)

| Sector | Examples |
|--------|----------|
| Souveraineté / Sécurité | Défense, Intérieur, Justice, Affaires Étrangères, Droits Humains |
| Finances / Économie | Finances, Budget, Économie Nationale, Plan, Portefeuille, Commerce Extérieur, PME |
| Travail / Fonction Publique | Fonction Publique, Emploi & Travail, Prévoyance Sociale |
| Secteurs Sociaux | Santé, Éducation, Enseignement Supérieur, Affaires Sociales, Genre, Jeunesse, Sports |
| Infrastructures & Ressources | Travaux Publics, Transports, Mines, Hydrocarbures, Énergie, Agriculture, etc. |
| Communication / Culture | Communication & Médias, Culture, Tourisme, Numérique / TIC |

### Key roles for payroll

- Ministre des Finances  
- Ministre du Budget  
- Ministre de la Fonction Publique  
- Ministre de l’Emploi  
- Secrétaires Généraux  
- Directeurs de la Paie, du Budget, Informatique  

---

## 4. API Reference

Base URL: `https://beeclean-eight.vercel.app/`  
Auth: **Bearer JWT** in `Authorization` header for protected routes.  
`Admin` only: indicated below where applicable.

### 4.1 Health & Roles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Health / version |
| GET | `/roles` | No | List RDC payroll roles |

### 4.2 Dashboard (Tableau de bord)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | Yes | **Use this for the dashboard.** Returns: `totalEmployees`, `totalBudget`, `totalBudgetSpent`, `activePayrolls`, `pendingVerifications`, `unreadMessages`, `upcomingPayments[]`, `recentActivities[]`, `systemStatus`. |

**Frontend:** Call `GET /dashboard` with header `Authorization: Bearer <token>` after login. The response matches the metrics shown on the Tableau de bord (Total Employés, Budget Total, Paies Actives, Vérifications, Paiements à Venir, etc.).

### 4.3 Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register (name, surname, email, role, password) |
| POST | `/auth/login` | No | Login |
| GET | `/auth/me` | Yes | Current user |
| POST | `/auth/logout` | Yes | Logout (client drops token) |

### 4.4 Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Yes | List users (role, search, limit, offset) |
| GET | `/users/search?query=...` | Yes | Search users |
| GET | `/users/:id` | Yes | Get user |
| PUT | `/users/:id` | Yes | Update profile (self or Admin) |
| PUT | `/users/:id/role` | Admin | Update role |
| DELETE | `/users/:id` | Admin | Delete user |

### 4.5 Ministries

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/ministries` | Yes | List (optional: sector, payment_day, search) |
| GET | `/ministries/:id` | Yes | Get one |
| POST | `/ministries` | Admin | Create (name, code, sectorCategory, paymentDayOfMonth) |
| PUT | `/ministries/:id` | Admin | Update |
| DELETE | `/ministries/:id` | Admin | Delete |

### 4.6 Departments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/departments` | Yes | List (optional: ministry_id) |
| GET | `/departments/:id` | Yes | Get one |
| POST | `/departments` | Admin | Create (ministryId, name, code, budgetMonthly) |
| PUT | `/departments/:id` | Admin | Update |
| DELETE | `/departments/:id` | Admin | Delete |

### 4.7 Employees

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/employees` | Yes | List (ministry_id, department_id, status, search, limit, offset) |
| GET | `/employees/:id` | Yes | Get one (position & salary confirmation view) |
| POST | `/employees` | Admin | Create (ministryId, employeeNumber, name, surname, position, salary, bank/mobile money, etc.) |
| PUT | `/employees/:id` | Admin | Update (position, salary, status, bank, mobile money, biometric hashes, etc.) |
| DELETE | `/employees/:id` | Admin | Delete |

### 4.8 Employee Verifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/employee-verifications/employee/:employeeId` | Yes | List verifications for an employee |
| GET | `/employee-verifications/pending` | Yes | List pending verifications (optional: step) |
| POST | `/employee-verifications` | Admin | Create step (employeeId, step, notes) |
| PUT | `/employee-verifications/:id/approve` | Yes | Approve or reject (status, fingerprintUsed, notes) |

### 4.9 Payroll Runs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payroll-runs` | Yes | List (period_month, period_year, status, limit, offset) |
| GET | `/payroll-runs/:id` | Yes | Get one with steps |
| POST | `/payroll-runs` | Admin | Create draft (periodMonth, periodYear, budgetTotal) |
| PUT | `/payroll-runs/:id/step` | Yes | Advance step (stepName, payload) – report_uploaded → audit_approved → auth_approved → payment_done → reconciled |
| POST | `/payroll-runs/:id/generate-payslips` | Admin | Generate payslips for active employees |

### 4.10 Payroll Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payroll-reports` | Yes | List (payroll_run_id, ministry_id, period_month, period_year, report_type) |
| GET | `/payroll-reports/:id` | Yes | Get one |
| POST | `/payroll-reports` | Admin | Upload report metadata (payrollRunId, ministryId, periodMonth, periodYear, reportType, fileUrl, fileName) |

### 4.11 Budgets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/budgets` | Yes | List (ministry_id, department_id, period_month, period_year) |
| GET | `/budgets/:id` | Yes | Get one |
| POST | `/budgets` | Admin | Create (ministryId, periodMonth, periodYear, amount, departmentId) |
| PUT | `/budgets/:id` | Admin | Update (amount, departmentId) |
| DELETE | `/budgets/:id` | Admin | Delete |

### 4.12 Payslips

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payslips` | Yes | List (payroll_run_id or employee_id, limit, offset) |
| GET | `/payslips/:id` | Yes | Get one |
| PUT | `/payslips/:id/paid` | Admin | Mark as paid |

### 4.13 Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/messages/employee/:employeeId` | Yes | List messages (type, unread_only, limit) |
| GET | `/messages/:id` | Yes | Get one |
| POST | `/messages` | Admin | Send (employeeId, type: pay_notification | sanction | promotion | deduction | general, title, body) |
| PUT | `/messages/:id/read` | Yes | Mark as read |

### 4.14 Sanctions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sanctions` | Yes | List (employee_id, limit, offset) |
| GET | `/sanctions/:id` | Yes | Get one |
| POST | `/sanctions` | Admin | Create (employeeId, type, amountDeduction, reason) |

### 4.15 Excel Uploads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/excel-uploads` | Yes | List (ministry_id, upload_type, status) |
| GET | `/excel-uploads/:id` | Yes | Get one |
| POST | `/excel-uploads` | Admin | Register upload (fileName, fileUrl, ministryId, uploadType, rowsCount) |
| PUT | `/excel-uploads/:id/status` | Admin | Update status (e.g. after processing) |

### 4.16 Mobile Money

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/mobile-money/by-provider?provider=mpesa|airtel_money|orange_money` | Yes | List employees by provider (optional: ministry_id) |
| GET | `/mobile-money/no-bank` | Yes | List employees with mobile money set (optional: ministry_id) |
| POST | `/mobile-money/bulk-update` | Admin | Bulk set provider + number (updates: [{ employeeId, provider, mobileMoneyNumber }]) |

---

## 5. Payroll Run Status Flow

```
draft
  → report_uploaded   (report read & accepted)
  → audit_pending     (Ministry of Budget)
  → audit_approved
  → auth_pending      (Ministry of Finance)
  → auth_approved
  → payment_pending   (Bank + Finance)
  → payment_done
  → reconciled        (report closes, match budget)
```

---

## 6. Database (Drizzle / PostgreSQL)

Main entities:

- **users** – System users (roles aligned with RDC hierarchy).
- **ministries** – Name, code, sector category, payment day of month.
- **departments** – Under ministry; optional monthly budget.
- **employees** – Ministry, department, position, salary, status (active/suspended/deceased/retired), bank/mobile money, optional biometric hashes, verification timestamp.
- **employee_verifications** – Per-employee steps (pending/approved/rejected), optional fingerprint flag.
- **payroll_runs** – Period, status, budget total.
- **payroll_run_steps** – Step completion (report_uploaded, audit_approved, etc.).
- **payroll_reports** – Type (monthly, audit, authorisation, payment, reconciliation), file URL/name.
- **budgets** – Per ministry/department, per month/year.
- **payslips** – Employee, run, gross, deductions, net, paid_at.
- **messages** – Employee, type (pay_notification, sanction, promotion, deduction, general), title, body, read_at.
- **sanctions** – Employee, type, amount deduction, reason.
- **excel_uploads** – File name/URL, ministry, upload type, rows count, status.

Run migrations (e.g. `pnpm db:generate` then `pnpm db:migrate` or `pnpm db:push`) after schema changes.

---

## 7. Next Steps (Suggestions)

- **Biometrics:** Integrate real fingerprint/face capture and verification; keep `fingerprintHash` / `faceHash` and `fingerprintUsed` in verifications.
- **File storage:** Implement actual PDF/Excel upload (e.g. S3 or local) and set `fileUrl` in reports and excel_uploads.
- **Bank integration:** API or batch export for the bank (e.g. 0.5$ per employee commission tracking).
- **Deductions in payslips:** Use sanctions (and tax rules) when generating payslips in `POST /payroll-runs/:id/generate-payslips`.
- **Role-based access:** Restrict steps (e.g. audit only for Budget, authorisation only for Finance) by role in middleware.

---

*Document generated from the payroll discussion with Andy (11 Feb 2026) and the implemented APIs.*

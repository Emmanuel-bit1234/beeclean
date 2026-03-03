# Emails – implementation and API reference

This document explains how the **email communication** feature works in the RDC Payroll backend: SMTP setup, service layer, API endpoint, and how the frontend should use it.

---

## 1. Goal

Allow admins to send **one-off emails** to employees using the email address stored in the `employees` table, without requiring a third‑party API key – only standard **SMTP** credentials.

Each email sent is also logged as an internal `messages` row so it appears in the employee’s message history.

---

## 2. SMTP configuration (no external API key)

The backend uses **Nodemailer** with SMTP. Configure the following environment variables:

- `SMTP_HOST` – SMTP server hostname (e.g. `smtp.office365.com` or your provider).
- `SMTP_PORT` – SMTP port (e.g. `587`).
- `SMTP_SECURE` – `true` if using port 465, otherwise `false` or unset.
- `SMTP_USER` – SMTP username (email account or login).
- `SMTP_PASS` – SMTP password.
- `SMTP_FROM` – default `From` address, e.g. `Système de Paie RDC <no-reply@payroll.rdc.gov>`.

---

## 3. Email service (`src/services/email.ts`)

The `sendEmail` helper wraps Nodemailer:

```ts
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendEmail(opts: { to: string; subject: string; text: string; html?: string }) {
  if (!opts.to) throw new Error('Missing recipient email');
  const from = process.env.SMTP_FROM || 'no-reply@payroll.rdc.gov';

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? `<p>${opts.text}</p>`,
  });
}
```

No provider API key is used; only the SMTP credentials above.

---

## 4. API endpoint – `POST /emails`

- **URL:** `/emails`
- **Method:** `POST`
- **Auth:** Required (JWT) + **Admin** role (`authMiddleware`, `adminMiddleware`)
- **Purpose:** Send one email to a specific employee based on `employees.email`, and log it as an internal message.

### 4.1 Request

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**

```json
{
  "employeeId": 3,
  "subject": "Notification de paie février 2026",
  "body": "Bonjour, votre paie de février 2026 a été traitée."
}
```

- `employeeId` (number, required) – `employees.id`.
- `subject` (string, required) – non-empty after trim.
- `body` (string, required) – non-empty after trim.

### 4.2 Validation & behaviour

1. Validate presence of `employeeId`, `subject`, `body`.  
   - If missing/empty → **400** `{ "error": "employeeId, subject, body required" }`.
2. Load employee:
   - `SELECT id, email, name, surname FROM employees WHERE id = employeeId`.
   - If not found → **404** `{ "error": "Employee not found" }`.
   - If `email` is null/empty → **400** `{ "error": "Employee has no email on record" }`.
3. Call `sendEmail({ to: employee.email, subject, text: body })`.
4. Insert an internal message:
   - Insert into `messages` with:
     - `employeeId`: employee id  
     - `type`: `"general"`  
     - `title`: subject  
     - `body`: body text
5. Return **201** with:

```json
{
  "status": "sent",
  "to": "employee@example.com",
  "employeeId": 3
}
```

On any unexpected error (SMTP failure, DB issue), the route logs the error and returns **500** `{ "error": "Failed to send email" }`.

---

## 5. Frontend usage

To send an email from the UI (e.g. from the employee detail page or a \"Send email\" button):

1. Make sure the employee has an `email` stored (via `POST /employees` or `PUT /employees/:id`).
2. Call:

```http
POST /emails
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "employeeId": 3,
  "subject": "Notification de paie février 2026",
  "body": "Bonjour, votre paie de février 2026 a été traitée."
}
```

3. On **201**, show a success toast.  
4. If you fetch the employee’s messages (`GET /messages?employee_id=`), you will see a new `general` message with the same subject/body as the email.


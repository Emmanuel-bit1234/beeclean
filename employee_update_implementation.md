# Employee update implementation – email, bank, and mobile money

This document describes the recent changes to the **employees** model and API so that we always capture **email**, **bank details**, and **mobile money** information when creating or updating an employee.

---

## 1. Data model changes

Table: `employees`

- New/updated columns:
  - `email` `varchar(255)` (nullable in DB, but required at API level for create).
  - Existing financial/contact fields:
    - `bankAccount` `varchar(100)`
    - `bankName` `varchar(100)`
    - `mobileMoneyProvider` enum: `'mpesa' | 'airtel_money' | 'orange_money' | 'none'` (default `'none'`)
    - `mobileMoneyNumber` `varchar(50)`

Migration:

- `src/db/migrations/0005_add_email_to_employees.sql`
  - `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "email" varchar(255);`

Run your usual migration command so the DB schema matches the code.

---

## 2. Create employee – `POST /employees`

**Route:** `src/routes/employees.ts`  
**Endpoint:** `POST /employees` (auth, Admin).

### 2.1 Request body

```json
{
  "ministryId": 1,
  "departmentId": 2,
  "employeeNumber": "optional",
  "name": "string",
  "surname": "string",
  "email": "string",
  "position": "string",
  "salary": "1500.00",
  "bankAccount": "0123456789",
  "bankName": "Rawbank",
  "mobileMoneyProvider": "mpesa",
  "mobileMoneyNumber": "+243970000000"
}
```

### 2.2 Validation rules

The backend now enforces:

- **Required fields:**
  - `ministryId`
  - `name`
  - `surname`
  - `email`
  - `position`
  - `salary`
- **Bank details:**
  - `bankAccount` and `bankName` are **required** (must be non-empty).
- **Mobile money:**
  - `mobileMoneyProvider` can be `'mpesa' | 'airtel_money' | 'orange_money' | 'none'` (default `'none'`).
  - If `mobileMoneyProvider` is provided and is **not** `'none'`, then `mobileMoneyNumber` must be non-empty.
- **Employee number:**
  - `employeeNumber` is **optional**.
  - If omitted or empty, it is auto-generated from the ministry code using the pattern `{ministryCode}-{seq}` (e.g. `FIN-001`, `BUD-002`).

If any of these rules fail, the API returns **400** with an appropriate `error` message:

- `ministryId, name, surname, email, position, salary required`
- `bankAccount and bankName are required`
- `mobileMoneyNumber is required when mobileMoneyProvider is not none`

### 2.3 Insert behaviour

On success, the backend inserts into `employees`:

- `ministryId`, `departmentId`
- `employeeNumber` (provided or generated)
- `name`, `surname`, `email`
- `position`, `salary`
- `bankAccount`, `bankName`
- `mobileMoneyProvider` (or `'none'` if omitted)
- `mobileMoneyNumber` (trimmed or `null`)

The 201 response returns the full `employee` object, including `email`, bank, and mobile money fields (see `API_RESPONSES.md`).

---

## 3. List / get employees – email included

- **GET /employees**
  - Now includes `email` in each list item:
    - Selected fields: `id, ministryId, departmentId, employeeNumber, name, surname, email, position, salary, status, bankAccount, bankName, mobileMoneyProvider, mobileMoneyNumber, ...`
- **GET /employees/:id**
  - Returns `employee` with all columns from the `employees` table, which now includes `email`.

No extra query parameters are required; the new field simply appears in the JSON.

---

## 4. Update employee – `PUT /employees/:id`

**Endpoint:** `PUT /employees/:id` (auth, Admin).

- The update whitelist now includes `email`:
  - Allowed keys: `ministryId, departmentId, employeeNumber, name, surname, email, position, salary, status, bankAccount, bankName, mobileMoneyProvider, mobileMoneyNumber, fingerprintHash, faceHash`.
- Type validations remain:
  - `status` must be one of `active | suspended | deceased | retired`.
  - `mobileMoneyProvider` must be one of `'mpesa' | 'airtel_money' | 'orange_money' | 'none'`.
- `updatedAt` is automatically set to `new Date()` on each update.


# Sanctions et Déductions – API reference

This document describes how **sanctions** (and deductions) are handled in the RDC Payroll system: data model, endpoints, and how they appear on the Rapports screen.

---

## 1. What are sanctions?

**Sanctions** are disciplinary or financial penalties applied to an employee and recorded in the system. Examples:

- **Déduction** (deduction) – a monetary amount to deduct (e.g. for unjustified lateness, absence).
- **Suspension** – type can be stored; amount may be 0.
- Other types – any string value in `type` (e.g. `warning`, `reprimand`).

Each sanction has:

- The **employee** concerned.
- A **type** and optional **amount** to deduct.
- A **reason** (text).
- **When** it was applied (`appliedAt`) and **who** recorded it (`createdByUserId`).

Sanctions are **recorded** via the API. They can be shown in the **Sanctions et Déductions** block on the Rapports screen and used later (e.g. when generating or adjusting payslips) to apply deductions.

---

## 2. Data model (backend)

Table: **`sanctions`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key. |
| `employee_id` | integer | FK to `employees.id` (required). |
| `type` | varchar(50) | e.g. `deduction`, `suspension`. |
| `amount_deduction` | decimal(18,2) | Amount to deduct (default 0). |
| `reason` | text | Justification (required). |
| `applied_at` | timestamp | When the sanction applies (default: now). |
| `created_by_user_id` | integer | FK to `users.id` (who created it). |
| `created_at` | timestamp | When the row was created. |

---

## 3. Endpoints (all require auth)

Base path: **`/sanctions`**. Send **`Authorization: Bearer <token>`** on every request.  
**Create** requires **Admin** role.

| Action | Method | URL | Body / Query |
|--------|--------|-----|--------------|
| List sanctions | **GET** | `/sanctions` | Query: `employee_id`, `limit`, `offset` (all optional) |
| Get one sanction | **GET** | `/sanctions/:id` | — |
| Create sanction (Admin) | **POST** | `/sanctions` | Body: `employeeId`, `type`, `reason`; optional: `amountDeduction` |

---

## 4. GET /sanctions – list (Sanctions et Déductions table)

Used to populate the **Sanctions et Déductions** block (e.g. on the Rapports screen).

**Query parameters (all optional):**

- `employee_id` – filter by employee ID.
- `limit` – max rows (default 50, max 200).
- `offset` – for pagination (default 0).

**Example – all sanctions:**

```http
GET /sanctions?limit=50
Authorization: Bearer <token>
```

**Example – sanctions for one employee:**

```http
GET /sanctions?employee_id=3
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "sanctions": [
    {
      "id": 1,
      "employeeId": 3,
      "type": "deduction",
      "amountDeduction": "50",
      "reason": "Retard non justifié (janvier 2026)",
      "appliedAt": "2026-02-22T18:28:00.000Z",
      "createdByUserId": 1,
      "createdAt": "2026-02-22T18:28:00.000Z",
      "employeeName": "Paul",
      "employeeSurname": "Mutombo",
      "employeeNumber": "EMP-001",
      "createdByName": "Admin",
      "createdBySurname": "User"
    }
  ]
}
```

**Mapping to the UI table:**

| Column on screen | Source field(s) |
|------------------|-----------------|
| Employé | `employeeName` + `employeeSurname` (e.g. "Paul Mutombo") |
| Type | `type` (e.g. "deduction") |
| Montant déduit | `amountDeduction` (e.g. "50 FC") |
| Raison | `reason` |
| Date | `appliedAt` (e.g. "22/02/2026") |

---

## 5. GET /sanctions/:id – one sanction

**Example:** `GET /sanctions/1`

**Response 200:**

```json
{
  "sanction": {
    "id": 1,
    "employeeId": 3,
    "type": "deduction",
    "amountDeduction": "50",
    "reason": "Retard non justifié (janvier 2026)",
    "appliedAt": "2026-02-22T18:28:00.000Z",
    "createdByUserId": 1,
    "createdAt": "2026-02-22T18:28:00.000Z",
    "employeeName": "Paul",
    "employeeSurname": "Mutombo",
    "employeeNumber": "EMP-001"
  }
}
```

**404:** `{ "error": "Sanction not found" }`

---

## 6. POST /sanctions – create (Admin)

Used when an admin records a new sanction/deduction.

**Request:**

```http
POST /sanctions
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | number | Yes | ID of the employee. |
| `type` | string | Yes | e.g. `deduction`, `suspension`. |
| `reason` | string | Yes | Justification text. |
| `amountDeduction` | number or string | No | Amount to deduct (default 0). |

**Example:**

```json
{
  "employeeId": 3,
  "type": "deduction",
  "amountDeduction": "50",
  "reason": "Retard non justifié (janvier 2026)"
}
```

**Response 201:**

```json
{
  "sanction": {
    "id": 1,
    "employeeId": 3,
    "type": "deduction",
    "amountDeduction": "50",
    "reason": "Retard non justifié (janvier 2026)",
    "appliedAt": "2026-02-22T18:28:00.000Z",
    "createdByUserId": 1,
    "createdAt": "2026-02-22T18:28:00.000Z"
  }
}
```

**Errors:**

- **400** – `employeeId, type, reason required`
- **404** – `Employee not found` (invalid `employeeId`)
- **401** – Not authenticated
- **403** – Not Admin
- **500** – Server/DB error

---

## 7. Frontend flow summary

- **Sanctions et Déductions block (e.g. Rapports):**  
  Call `GET /sanctions` (optionally with `employee_id`). Map the response to the table columns as in the table above.

- **Create sanction (Admin):**  
  Form: employee (from `GET /employees` or search), type, amount, reason.  
  Submit → `POST /sanctions` with the JSON body. On 201, refresh the list or navigate as needed.

- **Detail view:**  
  Use `GET /sanctions/:id` to load a single sanction (e.g. for a detail drawer or page).

---

## 8. Relation to payslips

Sanctions are **stored** here; they are **not** automatically applied to payslips. When generating or editing payslips (e.g. in Traitement de la Paie), your logic can:

- Query sanctions for the employee and period (e.g. `GET /sanctions?employee_id=...`).
- Use `amountDeduction` and `reason` to set or adjust `payslips.deductions` and related fields.

This file is the single reference for sanctions in the RDC Payroll API.

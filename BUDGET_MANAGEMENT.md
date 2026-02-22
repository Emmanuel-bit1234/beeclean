# Gestion Budgétaire – How it works and API reference

This document explains how the **Budget Management** (Gestion Budgétaire) screen works and lists all budget-related endpoints, including **Ajouter Budget**.

---

## 1. What the screen shows

- **Budget Total** – Sum of all allocated budgets for the selected period (e.g. février 2026).
- **Budget Alloué** – Same as total allocated for that period (sum of `budgets.amount` for the period).
- **Budget Restant** – Allocated minus spent (spent = payslips from payment_done/reconciled runs for that period).
- **Départements** – Count of budget rows (or ministries with a budget) for the period.
- **Table "Allocation Budgétaire par Département"** – One row per ministry (or per budget row) with: Ministère, Jour de Paiement, Montant Alloué, Montant Dépensé, Reste, Employés, Actions (Edit / Delete).
- **Ajouter Budget** – Button to create a new budget line (ministry + period + amount).

All values are for the **selected month/year** (e.g. février 2026). If no budgets exist for that period, the table shows "Aucun budget trouvé" and the cards show 0 FC.

---

## 2. Endpoints (all require auth)

Base path: **`/budgets`**. Send **`Authorization: Bearer <token>`** on every request.  
Create, update, and delete require **Admin** role.

| Action | Method | URL | Body / Query |
|--------|--------|-----|--------------|
| List budgets (for table + totals) | **GET** | `/budgets` | Query: `period_month`, `period_year`, `ministry_id`, `department_id` (all optional) |
| Get one budget | **GET** | `/budgets/:id` | — |
| **Ajouter Budget** (create) | **POST** | `/budgets` | Body: `ministryId`, `periodMonth`, `periodYear`, `amount`; optional: `departmentId` |
| Edit budget | **PUT** | `/budgets/:id` | Body: `amount`?, `departmentId`? |
| Delete budget | **DELETE** | `/budgets/:id` | — |

---

## 3. GET /budgets (list)

**Query parameters (all optional):**

- `period_month` – e.g. `2` for février
- `period_year` – e.g. `2026`
- `ministry_id` – filter by ministry
- `department_id` – filter by department

**Example for the selected month on the page:**

```http
GET /budgets?period_month=2&period_year=2026
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "budgets": [
    {
      "id": 1,
      "ministryId": 1,
      "departmentId": null,
      "periodMonth": 2,
      "periodYear": 2026,
      "amount": "300000000",
      "allocatedAt": "2026-02-01T00:00:00.000Z",
      "createdAt": "2026-02-01T00:00:00.000Z",
      "ministryName": "Ministère des Finances",
      "departmentName": null
    }
  ]
}
```

Use this to:

- Build the table (each item = one row; join with ministries for **Jour de Paiement** if not in the row).
- Compute **Budget Total** / **Budget Alloué** = sum of `amount` over the returned list.
- **Budget Restant** = that sum minus spent (get spent from `GET /dashboard` → `totalBudgetSpent` for the same period, or from your own aggregation of payslips).

**Jour de Paiement** is not on the budget; get it from **GET /ministries** (each ministry has `paymentDayOfMonth`). Merge by `ministryId`.

---

## 4. POST /budgets – Ajouter Budget

This is the endpoint for the **"+ Ajouter Budget"** button.

**Request:**

```http
POST /budgets
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ministryId` | number | Yes | ID of the ministry (from GET /ministries). |
| `periodMonth` | number | Yes | Month (1–12). |
| `periodYear` | number | Yes | Year (e.g. 2026). |
| `amount` | number or string | Yes | Allocated amount in FC (non-negative). |
| `departmentId` | number | No | If allocation is per department, set this. |

**Example:**

```json
{
  "ministryId": 1,
  "periodMonth": 2,
  "periodYear": 2026,
  "amount": "300000000"
}
```

**Response 201:**

```json
{
  "budget": {
    "id": 5,
    "ministryId": 1,
    "departmentId": null,
    "periodMonth": 2,
    "periodYear": 2026,
    "amount": "300000000",
    "allocatedAt": "2026-02-21T12:00:00.000Z",
    "createdAt": "2026-02-21T12:00:00.000Z"
  }
}
```

**Errors:**

- **400** – Missing required field: `ministryId, periodMonth, periodYear, amount required`
- **400** – Invalid amount: `amount must be a non-negative number`
- **401** – Not authenticated
- **403** – Not Admin
- **500** – Server/DB error (e.g. invalid `ministryId` or `departmentId`)

After a successful create, refetch the list with **GET /budgets?period_month=&period_year=** for the selected period so the table and totals update.

---

## 5. GET /budgets/:id (one budget)

**Example:** `GET /budgets/1`

**Response 200:** `{ "budget": { ... } }` with `ministryName` and `departmentName` when available.  
**404:** `{ "error": "Budget not found" }`

---

## 6. PUT /budgets/:id (edit)

**Body (all optional):**

- `amount` – new amount (number or string).
- `departmentId` – number or `null`.

**Example:** `PUT /budgets/1` with `{ "amount": "350000000" }`

**Response 200:** `{ "budget": { ... } }`  
**400:** `No fields to update`  
**404:** `Budget not found`

---

## 7. DELETE /budgets/:id

**Response 200:** `{ "message": "Budget deleted" }`  
**404:** `{ "error": "Budget not found" }`

---

## 8. Frontend flow summary

1. **Page load (e.g. février 2026)**  
   - `GET /budgets?period_month=2&period_year=2026` → table rows + sum for Budget Total / Alloué.  
   - `GET /ministries` → ministry names and `paymentDayOfMonth` (Jour de Paiement).  
   - `GET /dashboard` → `totalBudgetSpent` for Restant (Total Alloué − totalBudgetSpent).

2. **Ajouter Budget**  
   - User fills ministry (from ministries list), period (month/year), amount.  
   - `POST /budgets` with `{ ministryId, periodMonth, periodYear, amount, departmentId? }`.  
   - On 201, refetch `GET /budgets?period_month=&period_year=` and update totals.

3. **Edit**  
   - `PUT /budgets/:id` with `{ amount }` and/or `{ departmentId }`, then refetch list.

4. **Delete**  
   - `DELETE /budgets/:id`, then refetch list.

---

## 9. Why everything shows 0 / "Aucun budget trouvé"

- No rows in `budgets` for the selected **period_month** and **period_year**.
- Fix: use **Ajouter Budget** to create at least one budget for that period (POST /budgets with the chosen month/year). After that, the list and totals will reflect the new data.

All endpoints above are implemented and working; Ajouter Budget is **POST /budgets** with the body described in section 4.

# Dépensés – Guide

What "dépensés" is, where the frontend gets it, how the backend computes it, and why it might show 0.

---

## 1. What is "dépensés"?

**Dépensés** = total amount (in FC) considered **spent** for the **current calendar month and year** (e.g. February 2026). It is the sum of net pay from payslips that belong to payroll runs for that period and that are treated as "paid" (see below).

---

## 2. What the frontend should pull

| Item | Value |
|------|--------|
| **Endpoint** | `GET /dashboard` |
| **Auth** | Required. Header: `Authorization: Bearer <token>` |
| **Response field** | `totalBudgetSpent` |
| **Type** | String (number in FC, e.g. `"650000000"`) |

The Tableau de bord "0 FC dépensés" (or "X FC dépensés") must display **exactly** the value of **`response.totalBudgetSpent`** from this endpoint. No other field or calculation should be used for dépensés.

**Example request:**
```http
GET /dashboard
Authorization: Bearer <your-jwt>
```

**Example response (relevant part):**
```json
{
  "totalEmployees": 12,
  "totalBudget": "300000650000000",
  "totalBudgetSpent": "650000000",
  "activePayrolls": 0,
  "pendingVerifications": 0,
  "unreadMessages": 0,
  "upcomingPayments": [...],
  "recentActivities": [...],
  "systemStatus": {...}
}
```

**Frontend usage:** Use `data.totalBudgetSpent` (or whatever your client stores the JSON in) for the "dépensés" label. Format the string as needed for display (e.g. "650 000 000 FC").

---

## 3. How the backend computes `totalBudgetSpent`

The backend:

1. Takes **current month** and **current year** from the server date (e.g. February = 2, 2026).
2. Selects all **payslips** that:
   - belong to a **payroll run** with `periodMonth` = current month and `periodYear` = current year, and  
   - **either** that run’s status is **`payment_done`** or **`reconciled`**, **or** the payslip has **`paid_at`** set.
3. Sums the **`net`** of those payslips.
4. Returns that sum as the string **`totalBudgetSpent`**.

So: only the **current** period is included. Runs for other months (e.g. décembre 2025) are ignored. Within the current period, any run that is "Paiement" done or "Réconcilié" has all its payslips counted, even if `paid_at` is not set on each slip.

---

## 4. Why the frontend might still show 0

If the UI shows **0 FC dépensés** even though Traitement de la Paie shows a run as Payé/Réconcilié for the current month:

| Check | What to verify |
|-------|----------------|
| **Correct endpoint** | The screen is calling **`GET /dashboard`** (with base URL), not another path. |
| **Correct field** | The value displayed is **`response.totalBudgetSpent`**. Not `totalBudget`, not a local calculation, not a different key. |
| **Auth** | The request sends **`Authorization: Bearer <token>`**. Unauthenticated or wrong token can lead to 401 or a different/error response. |
| **Response body** | Inspect the actual JSON: does `totalBudgetSpent` already contain a number (e.g. `"650000000"`) or is it `"0"`? |
| **Backend deployed** | The running API is the version that counts runs with status `payment_done` / `reconciled`. Redeploy or restart if you recently changed the backend. |
| **Period** | Server date = current month/year. If the run is for another month (e.g. décembre 2025), it will not be included. |
| **Run status in DB** | For the current period, at least one run has status **`payment_done`** or **`reconciled`**. If the run is still e.g. `payment_pending`, the backend will not count it. |

Quick test: call `GET /dashboard` with a valid token (e.g. from the browser’s network tab or Postman) and read `totalBudgetSpent` from the JSON. If it is non-zero there but the UI shows 0, the bug is in the frontend (wrong field or wrong endpoint). If it is `"0"` in the response, the issue is period/run status/deployment (backend side).

---

## 5. Summary

| Question | Answer |
|----------|--------|
| What is dépensés? | Total FC spent for the **current** month/year. |
| Where does it come from? | **GET /dashboard** → **`totalBudgetSpent`** (string). |
| What does the frontend do? | Call GET /dashboard with auth and display **`totalBudgetSpent`** as "X FC dépensés". |
| How is it computed? | Sum of payslips (net) for current-period runs that are `payment_done` or `reconciled`, or have `paid_at` set. |
| Why 0? | Wrong endpoint/field, no auth, backend not updated, or no run for current period in `payment_done`/`reconciled`. |

Use this file as the single reference for "dépensés" in the Tableau de bord.

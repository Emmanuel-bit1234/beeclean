# Dashboard amounts: why "0 FC" and what the endpoint returns

This document explains why the Tableau de bord can show **0 FC dépensés** and **amountFC: "0"** in Paiements à Venir, and what `GET /dashboard` returns.

---

## DB verification (current behaviour)

Using `scripts/check-paid-payslips.ts` and the current dashboard code, we can see for example that there is a payroll run for **février 2026** with status `reconciled` and `budgetTotal = 650 000 000 FC`. The dashboard now counts as "spent" the **sum of `budgetTotal`** for all runs in the current period whose status is `payment_done` or `reconciled`. So if février 2026 is "Réconcilié" on Traitement de la Paie, the Tableau de bord will show **650 000 000 FC** in "dépensés" even if no payslips have been generated yet.

---

## Traitement de la Paie vs Tableau de bord

- **totalBudgetSpent** on the Tableau de bord is only for the **current** calendar month and year (e.g. February 2026). It does **not** include other periods (e.g. décembre 2025).
- The dashboard counts as "spent" the **`budgetTotal`** of runs for the current period whose status is **`payment_done`** or **`reconciled`**. So when **février 2026** is "Payé" / "Réconcilié" on Traitement de la Paie with Montant total 650 000 000 FC, the Tableau de bord will show **650 000 000 FC** under "dépensés". Décembre 2025 is not included because it is a different period.

---

## 1. Why is "0 FC dépensés"?

**"Dépensés"** is the sum of money considered **spent** for the current period.

- The backend sets **totalBudgetSpent** = sum of **`payroll_runs.budgetTotal`** where:
  - the run belongs to the **current month and year**, and  
  - the run status is **`payment_done`** or **`reconciled`**.

So when a run for the current period (e.g. février 2026) is marked "Paiement" complété or "Réconcilié" on Traitement de la Paie, its `budgetTotal` is included in "dépensés". The "Paiements à Venir" section shows **planned** amounts; they do not increase "dépensés" until there is at least one run in `payment_done`/`reconciled` for that period.

---

## 2. Why is `amountFC` "0" in Paiements à Venir?

For each ministry in **upcomingPayments**, **amountFC** is taken from the **budgets** table:

- One budget row is looked up with:
  - **ministryId** = that ministry,
  - **periodMonth** = current month,
  - **periodYear** = current year.
- The value returned is that row’s **amount**, or **"0"** if there is no row or the amount is zero.

So **`"amountFC": "0"`** means either:

1. **No budget for that ministry for the current month/year**  
   There is no row in `budgets` for (ministryId, currentMonth, currentYear), so the backend uses `"0"`.

2. **Budget exists but amount is 0**  
   A row exists but its `amount` is 0 (e.g. not yet allocated).

To get a non-zero amount for a ministry in "Paiements à Venir", ensure there is a **budget** for that ministry and the current period with a positive **amount** (e.g. via `POST /budgets` or your budget management flow).

---

## 3. What does `GET /dashboard` return?

**Endpoint:** `GET /dashboard` (requires auth).

**Response 200** (example):

```json
{
  "totalEmployees": 12,
  "totalBudget": "300000650000000",
  "totalBudgetSpent": "0",
  "activePayrolls": 1,
  "pendingVerifications": 0,
  "unreadMessages": 0,
  "upcomingPayments": [
    {
      "ministryName": "Santé Publique",
      "ministryId": 1,
      "paymentDay": 20,
      "paymentDate": "20 février",
      "employeeCount": 2,
      "amountFC": "0"
    },
    {
      "ministryName": "Ministère de l'Emploi et Travail",
      "ministryId": 2,
      "paymentDay": 22,
      "paymentDate": "22 février",
      "employeeCount": 2,
      "amountFC": "80000000"
    }
  ],
  "recentActivities": [
    {
      "type": "payroll_run",
      "label": "Paie décembre 2025",
      "status": "report_uploaded",
      "at": "2026-02-22T18:28:00.000Z"
    }
  ],
  "systemStatus": {
    "workflowActive": true,
    "verificationsPending": 0,
    "messagesUnread": 0
  }
}
```

| Field | Description |
|-------|-------------|
| **totalEmployees** | Count of active employees. |
| **totalBudget** | Sum of current-month budgets (string). |
| **totalBudgetSpent** | Sum of `budgetTotal` for current-month payroll runs in status `payment_done` or `reconciled` (string). |
| **activePayrolls** | Number of payroll runs that are not draft and not reconciled. |
| **pendingVerifications** | Count of verification steps with status `pending`. |
| **unreadMessages** | Count of messages with `readAt` null. |
| **upcomingPayments** | One entry per ministry: name, id, payment day/date, employee count, **amountFC** (from current-month budget for that ministry). |
| **recentActivities** | Last payroll runs: type, label, status, timestamp. |
| **systemStatus** | workflowActive, verificationsPending, messagesUnread. |

So: **"0 FC dépensés"** and **amountFC: "0"** both come from this response: the first from **totalBudgetSpent**, the second from the budget amount (or missing budget) for each ministry in **upcomingPayments**.

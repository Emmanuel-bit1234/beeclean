# Rapports – How it works and API reference

This document explains how the **Rapports** screen works (monthly/audit/authorisation/payment/reconciliation reports, sanctions & deductions, and dépôt de rapport Admin) and lists all related endpoints.

---

## 1. What the screen shows

For a selected **période** (e.g. février 2026) and an optional **type de rapport**:

- **Rapports de Paie** table  
  - One row per payroll report (`payroll_reports`): Type, Période, Fichier, Cycle de paie, Actions (Télécharger).
- **Sanctions et Déductions** section  
  - List of sanctions/deductions applied to employees (for context next to reports).
- **Dépôt de rapport (Admin)** block  
  - Allows an Admin to upload/deposer a new report for the selected period (body → `POST /payroll-reports`).

All of this is read from the backend; the Rapports page itself does **not** compute business logic – it consumes the APIs below.

---

## 2. Endpoints (all require auth)

Main APIs used by the Rapports page:

| Feature | Method | URL | Notes |
|--------|--------|-----|-------|
| List reports | **GET** | `/payroll-reports` | With filters: `payroll_run_id`, `ministry_id`, `period_month`, `period_year`, `report_type`, `limit`. |
| Report detail | **GET** | `/payroll-reports/:id` | Returns one `report` object (metadata only, not the file content). |
| Download file (base64 case) | **GET** | `/payroll-reports/:id/file` | Returns the binary PDF when file was uploaded as base64. |
| Déposer un rapport (Admin) | **POST** | `/payroll-reports` | Body: periodMonth, periodYear, reportType, payrollRunId?, ministryId?, **either** fileUrl+fileName or fileBase64+fileName. |
| Alternative upload (cloud from backend) | **POST** | `/payroll-reports/upload` | Multipart; currently returns **501** until cloud storage is configured. |
| Sanctions & déductions list | **GET** | `/sanctions` or `/sanctions?employee_id=` | Returns sanctions with employee info and created-by info. |

---

## 3. GET /payroll-reports – list for the table

**Request:**

```http
GET /payroll-reports?period_month=2&period_year=2026&report_type=monthly
Authorization: Bearer <token>
```

Supported query parameters:

- `payroll_run_id` – filter by a specific cycle de paie.
- `ministry_id` – filter by ministry.
- `period_month`, `period_year` – filter by période (used by the dropdowns).
- `report_type` – one of: `monthly`, `audit`, `authorisation`, `payment`, `reconciliation`.
- `limit` – max number of rows (default 50, max 100).

**Response 200:**

```json
{
  "reports": [
    {
      "id": 1,
      "payrollRunId": 5,
      "ministryId": null,
      "periodMonth": 2,
      "periodYear": 2026,
      "reportType": "monthly",
      "fileUrl": "https://.../payroll-reports/1/file",
      "fileName": "TEST.pdf",
      "uploadedByUserId": 1,
      "createdAt": "2026-02-23T12:00:00.000Z"
    }
  ]
}
```

Use this to:

- Fill the **Rapports de Paie** table.
- Derive the Période (from `periodMonth`/`periodYear`), Type, and Cycle de paie (from `payrollRunId`).
- Use `fileName` for the **Fichier** column and `fileUrl` + actions for the **Télécharger** button.

> Note: The backend deliberately **omits** the base64 data from this response; only metadata is returned. Use `fileUrl` or `GET /payroll-reports/:id/file` to actually download the file.

---

## 4. GET /payroll-reports/:id – detail

**Request:** `GET /payroll-reports/:id`  
**Response 200:** `{ "report": { ... } }` (same shape as list item).  
**404:** `{ "error": "Report not found" }`.

This is mainly useful if the UI needs to refresh a single report after upload or edit.

---

## 5. GET /payroll-reports/:id/file – download

When a report was uploaded using **`fileBase64`**, the file content is stored in the DB. The download endpoint:

- Looks up `file_content_base64` + `fileName`.
- Decodes base64 to binary.
- Returns a response with:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="..."`.

**Request:**

```http
GET /payroll-reports/1/file
Authorization: Bearer <token>
```

If no base64 is stored for that report, you get:

- **404:** `{ "error": "Report file not found" }`.

If `fileUrl` points to an external storage (S3/Vercel Blob/… instead of `/payroll-reports/:id/file`), the UI can skip this endpoint and open `fileUrl` directly.

---

## 6. POST /payroll-reports – Dépôt de rapport (Admin)

This is the API behind the **“Dépôt de rapport (Admin)”** block on the Rapports screen.

**Request:**

```http
POST /payroll-reports
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (JSON):**

You have two options – **base64 inline** or **URL externe**.

### Option A – Base64 inline (recommended if no cloud storage)

```json
{
  "payrollRunId": 5,
  "ministryId": null,
  "periodMonth": 2,
  "periodYear": 2026,
  "reportType": "monthly",
  "fileName": "TEST.pdf",
  "fileBase64": "JVBERi0xLjQKJ..."
}
```

Rules:

- `fileBase64` is the base64 string **without** the `data:...;base64,` prefix.
- If `fileBase64` is provided, `fileName` is **required**.

The backend will:

- Store `fileBase64` in `file_content_base64`.
- Insert the row in `payroll_reports`.
- Set `fileUrl` to `/payroll-reports/:id/file` and return it in the response.

### Option B – URL externe

```json
{
  "payrollRunId": 5,
  "ministryId": null,
  "periodMonth": 2,
  "periodYear": 2026,
  "reportType": "monthly",
  "fileUrl": "https://storage.example.com/TEST.pdf",
  "fileName": "TEST.pdf"
}
```

Here:

- The file is hosted in cloud storage.
- The backend only stores `fileUrl`/`fileName` metadata.

**Response 201 (both options):**

```json
{
  "report": {
    "id": 1,
    "payrollRunId": 5,
    "ministryId": null,
    "periodMonth": 2,
    "periodYear": 2026,
    "reportType": "monthly",
    "fileUrl": "https://.../payroll-reports/1/file",
    "fileName": "TEST.pdf",
    "uploadedByUserId": 1,
    "createdAt": "2026-02-23T12:00:00.000Z"
  }
}
```

**Errors:**

- **400** – `periodMonth, periodYear, reportType required`
- **400** – `Invalid reportType`
- **400** – `fileName is required when fileBase64 is provided`
- **401 / 403** – Auth / Admin issues
- **500** – Server/DB error

---

## 7. Sanctions & Déductions – GET /sanctions

The **Sanctions et Déductions** block on the Rapports screen uses:

- `GET /sanctions` – list all sanctions (paginated).
- Or `GET /sanctions?employee_id=...` – list sanctions for a specific employee.

**Example:**

```http
GET /sanctions?limit=10
Authorization: Bearer <token>
```

**Response 200 (simplified):**

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

The Rapports page can simply filter this list to the selected **période** in the UI if needed, or call the endpoint with additional filters later if you add them.

---

## 8. Frontend flow summary for Rapports

For a given période (e.g. février 2026) and type:

1. **Load reports table**
   - Call: `GET /payroll-reports?period_month=2&period_year=2026&report_type=monthly` (and/or `payroll_run_id`).
   - Display `reports[]` as table rows; use `fileName` and `fileUrl` for the Fichier / Télécharger column.

2. **Load sanctions & deductions**
   - Call: `GET /sanctions?limit=10` (or without limit to get more).
   - Show the latest sanctions in the **Sanctions et Déductions** section.

3. **Dépôt de rapport (Admin)**
   - When the admin submits the form:
     - Gather: `payrollRunId` (cycle de paie), `periodMonth`, `periodYear`, `reportType`, `fileName`, and either `fileBase64` or `fileUrl`.
     - Call: `POST /payroll-reports` with the JSON body.
   - On success (201):
     - Refresh the list with `GET /payroll-reports?...` so the new report appears in the table.

This file is the single reference for how the **Rapports** page should interact with the backend.


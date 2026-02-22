# RDC Payroll API – Response Reference

**Base URL:** `https://beeclean-eight.vercel.app`  
**Auth:** Send `Authorization: Bearer <token>` for any endpoint marked "Yes" in Auth.  
**Errors:** Failed requests return `{ "error": "string" }` (and optionally `detail`) with status 4xx/5xx.

---

## 1. Health & roles (no auth)

### `GET /`
**Response 200**
```json
{
  "message": "RDC Government Payroll API",
  "status": "running",
  "version": "1.0.1"
}
```

### `GET /roles`
**Response 200**
```json
{
  "roles": ["Admin", "President", "Premier_Ministre", "VPM", "Ministre_Etat", "Ministre", "Ministre_Delegue", "Vice_Ministre", "Directeur_Cabinet", "Secretaire_General", "Directeur_Paie", "Directeur_Budget", "Directeur_Informatique", "Chef_Division", "Chef_Bureau", "Agent"]
}
```

---

## 2. Auth

### `POST /auth/register`
**Body:** `{ "name", "surname", "email", "role", "password" }`  
**Response 201**
```json
{
  "user": {
    "id": 1,
    "email": "string",
    "name": "string",
    "surname": "string",
    "role": "string"
  },
  "token": "string"
}
```
**Error 400:** `{ "error": "..." }` (e.g. missing field, invalid role)  
**Error 409:** `{ "error": "User with this email already exists" }`

### `POST /auth/login`
**Body:** `{ "email", "password" }`  
**Response 200**
```json
{
  "user": {
    "id": 1,
    "email": "string",
    "name": "string",
    "surname": "string",
    "role": "string"
  },
  "token": "string"
}
```
**Error 401:** `{ "error": "Invalid email or password" }`

### `GET /auth/me` (auth)
**Response 200**
```json
{
  "user": {
    "id": 1,
    "email": "string",
    "name": "string",
    "surname": "string",
    "role": "string"
  }
}
```

### `POST /auth/logout` (auth)
**Response 200**
```json
{
  "message": "Logged out successfully"
}
```

---

## 3. Dashboard (auth)

### `GET /dashboard` (auth)
**Response 200**
```json
{
  "totalEmployees": 8,
  "totalBudget": "650000000",
  "totalBudgetSpent": "0",
  "activePayrolls": 0,
  "pendingVerifications": 0,
  "unreadMessages": 0,
  "upcomingPayments": [
    {
      "ministryName": "string",
      "ministryId": 1,
      "paymentDay": 23,
      "paymentDate": "23 février",
      "employeeCount": 100,
      "amountFC": "25000000"
    }
  ],
  "recentActivities": [
    {
      "type": "payroll_run",
      "label": "Paie février 2026",
      "status": "draft",
      "at": "2026-02-22T12:00:00.000Z"
    }
  ],
  "systemStatus": {
    "workflowActive": false,
    "verificationsPending": 0,
    "messagesUnread": 0
  }
}
```
- `totalEmployees`: count of active employees.  
- `totalBudget`: sum of current-month budgets (string number).  
- `totalBudgetSpent`: sum of payslips (net) for current period where run is `payment_done`/`reconciled` or payslip has `paid_at` set (string number).  
- `activePayrolls`: runs not draft and not reconciled.  
- `pendingVerifications`: count of verification steps with status `pending`.  
- `unreadMessages`: count of messages with `readAt` null.  
- `upcomingPayments`: one entry per ministry; `paymentDate` is e.g. "23 février"; `amountFC` from current-month budget.

---

## 4. Users (auth)

### `GET /users` (auth)
**Query:** `role`, `search`, `limit`, `offset`  
**Response 200**
```json
{
  "users": [
    {
      "id": 1,
      "email": "string",
      "name": "string",
      "surname": "string",
      "role": "string",
      "createdAt": "2026-02-22T12:00:00.000Z",
      "updatedAt": "2026-02-22T12:00:00.000Z"
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

### `GET /users/search?query=...` (auth)
**Query:** `query` (required), `role`, `limit`  
**Response 200**
```json
{
  "users": [
    {
      "id": 1,
      "email": "string",
      "name": "string",
      "surname": "string",
      "role": "string"
    }
  ],
  "total": 5
}
```

### `GET /users/:id` (auth)
**Response 200**
```json
{
  "user": {
    "id": 1,
    "email": "string",
    "name": "string",
    "surname": "string",
    "role": "string",
    "createdAt": "2026-02-22T12:00:00.000Z",
    "updatedAt": "2026-02-22T12:00:00.000Z"
  }
}
```
**404:** `{ "error": "User not found" }`

### `PUT /users/:id` (auth)
**Body:** `{ "name"?, "surname"?, "email"? }`  
**Response 200**
```json
{
  "message": "User updated successfully",
  "user": { "id", "email", "name", "surname", "role", "createdAt", "updatedAt" }
}
```

### `PUT /users/:id/role` (auth, Admin)
**Body:** `{ "role": "string" }`  
**Response 200**
```json
{
  "message": "User role updated successfully",
  "user": { "id", "email", "name", "surname", "role", "createdAt", "updatedAt" }
}
```

### `DELETE /users/:id` (auth, Admin)
**Response 200**
```json
{
  "message": "User deleted successfully"
}
```

---

## 5. Ministries (auth)

### `GET /ministries` (auth)
**Query:** `sector`, `payment_day`, `search`  
**Response 200**
```json
{
  "ministries": [
    {
      "id": 1,
      "name": "string",
      "code": "string",
      "sectorCategory": "string",
      "paymentDayOfMonth": 25,
      "createdAt": "2026-02-22T12:00:00.000Z",
      "updatedAt": "2026-02-22T12:00:00.000Z"
    }
  ]
}
```

### `GET /ministries/:id` (auth)
**Response 200**
```json
{
  "ministry": {
    "id": 1,
    "name": "string",
    "code": "string",
    "sectorCategory": "string",
    "paymentDayOfMonth": 25,
    "createdAt": "2026-02-22T12:00:00.000Z",
    "updatedAt": "2026-02-22T12:00:00.000Z"
  }
}
```
**404:** `{ "error": "Ministry not found" }`

### `POST /ministries` (auth, Admin)
**Body:** `{ "name", "code", "sectorCategory", "paymentDayOfMonth" }`  
**Response 201**
```json
{
  "ministry": {
    "id": 1,
    "name": "string",
    "code": "string",
    "sectorCategory": "string",
    "paymentDayOfMonth": 25,
    "createdAt": "2026-02-22T12:00:00.000Z",
    "updatedAt": "2026-02-22T12:00:00.000Z"
  }
}
```

### `PUT /ministries/:id` (auth, Admin)
**Body:** `{ "name"?, "code"?, "sectorCategory"?, "paymentDayOfMonth"? }`  
**Response 200**
```json
{
  "ministry": { "id", "name", "code", "sectorCategory", "paymentDayOfMonth", "createdAt", "updatedAt" }
}
```

### `DELETE /ministries/:id` (auth, Admin)
**Response 200**
```json
{
  "message": "Ministry deleted"
}
```

---

## 6. Departments (auth)

### `GET /departments` (auth)
**Query:** `ministry_id`  
**Response 200**
```json
{
  "departments": [
    {
      "id": 1,
      "ministryId": 1,
      "name": "string",
      "code": "string",
      "budgetMonthly": "50000000",
      "ministryName": "string",
      "ministryCode": "string"
    }
  ]
}
```

### `GET /departments/:id` (auth)
**Response 200**
```json
{
  "department": {
    "id": 1,
    "ministryId": 1,
    "name": "string",
    "code": "string",
    "budgetMonthly": "50000000",
    "createdAt": "2026-02-22T12:00:00.000Z",
    "updatedAt": "2026-02-22T12:00:00.000Z",
    "ministryName": "string",
    "ministryCode": "string"
  }
}
```
**404:** `{ "error": "Department not found" }`

### `POST /departments` (auth, Admin)
**Body:** `{ "ministryId", "name", "code", "budgetMonthly"? }`  
**Response 201**
```json
{
  "department": {
    "id": 1,
    "ministryId": 1,
    "name": "string",
    "code": "string",
    "budgetMonthly": "0",
    "createdAt": "2026-02-22T12:00:00.000Z",
    "updatedAt": "2026-02-22T12:00:00.000Z"
  }
}
```

### `PUT /departments/:id` (auth, Admin)
**Body:** `{ "ministryId"?, "name"?, "code"?, "budgetMonthly"? }`  
**Response 200**
```json
{
  "department": { "id", "ministryId", "name", "code", "budgetMonthly", "createdAt", "updatedAt" }
}
```

### `DELETE /departments/:id` (auth, Admin)
**Response 200**
```json
{
  "message": "Department deleted"
}
```

---

## 7. Employees (auth)

### `GET /employees` (auth)
**Query:** `ministry_id`, `department_id`, `status`, `search`, `limit`, `offset`  
**Response 200**
```json
{
  "employees": [
    {
      "id": 1,
      "ministryId": 1,
      "departmentId": 1,
      "employeeNumber": "EMP-001",
      "name": "string",
      "surname": "string",
      "position": "string",
      "salary": "5000.00",
      "status": "active",
      "bankAccount": "string | null",
      "bankName": "string | null",
      "mobileMoneyProvider": "mpesa | airtel_money | orange_money | none",
      "mobileMoneyNumber": "string | null",
      "verifiedAt": "2026-02-22T12:00:00.000Z | null",
      "ministryName": "string | null",
      "departmentName": "string | null"
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

### `GET /employees/:id` (auth)
**Response 200**
```json
{
  "employee": {
    "id": 1,
    "userId": null,
    "ministryId": 1,
    "departmentId": 1,
    "employeeNumber": "EMP-001",
    "name": "string",
    "surname": "string",
    "position": "string",
    "salary": "5000.00",
    "status": "active",
    "bankAccount": "string | null",
    "bankName": "string | null",
    "mobileMoneyProvider": "mpesa | airtel_money | orange_money | none",
    "mobileMoneyNumber": "string | null",
    "fingerprintHash": "string | null",
    "faceHash": "string | null",
    "verifiedAt": "string | null",
    "verifiedByUserId": null,
    "createdAt": "string",
    "updatedAt": "string",
    "ministryName": "string | null",
    "ministryCode": "string | null",
    "departmentName": "string | null",
    "departmentCode": "string | null"
  }
}
```
**404:** `{ "error": "Employee not found" }`

### `POST /employees` (auth, Admin)
**Body:** `{ "ministryId", "name", "surname", "position", "salary", "employeeNumber"?, "departmentId"?, "bankAccount"?, "bankName"?, "mobileMoneyProvider"?, "mobileMoneyNumber"?, ... }`  
**Note:** `employeeNumber` is **optional**. If omitted, the backend auto-generates it from the ministry (format: `{ministryCode}-{seq}`, e.g. `FIN-001`, `BUD-002`).  
**Response 201**
```json
{
  "employee": {
    "id": 1,
    "userId": null,
    "ministryId": 1,
    "departmentId": null,
    "employeeNumber": "EMP-001",
    "name": "string",
    "surname": "string",
    "position": "string",
    "salary": "1500.00",
    "status": "active",
    "bankAccount": null,
    "bankName": null,
    "mobileMoneyProvider": "none",
    "mobileMoneyNumber": null,
    "fingerprintHash": null,
    "faceHash": null,
    "verifiedAt": null,
    "verifiedByUserId": null,
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### `PUT /employees/:id` (auth, Admin)
**Body:** partial employee fields (e.g. `position`, `salary`, `status`, `bankAccount`, …)  
**Response 200**
```json
{
  "employee": { full employee object }
}
```

### `DELETE /employees/:id` (auth, Admin)
**Response 200**
```json
{
  "message": "Employee deleted"
}
```

---

## 8. Employee verifications (auth)

### `GET /employee-verifications/employee/:employeeId` (auth)
**Response 200**
```json
{
  "verifications": [
    {
      "id": 1,
      "employeeId": 1,
      "step": "string",
      "status": "pending | approved | rejected",
      "verifiedAt": "string | null",
      "fingerprintUsed": false,
      "notes": "string | null",
      "verifiedByUserName": "string | null",
      "verifiedByUserSurname": "string | null"
    }
  ]
}
```

### `GET /employee-verifications/pending` (auth)
**Query:** `step`  
**Response 200**
```json
{
  "verifications": [
    {
      "id": 1,
      "employeeId": 1,
      "step": "string",
      "verifiedByUserId": null,
      "verifiedAt": null,
      "fingerprintUsed": false,
      "status": "pending",
      "notes": "string | null",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### `POST /employee-verifications` (auth, Admin)
**Body:** `{ "employeeId", "step", "notes"? }`  
**Response 201**
```json
{
  "verification": {
    "id": 1,
    "employeeId": 1,
    "step": "string",
    "verifiedByUserId": null,
    "verifiedAt": null,
    "fingerprintUsed": false,
    "status": "pending",
    "notes": null,
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### `PUT /employee-verifications/:id/approve` (auth)
**Body:** `{ "status": "approved" | "rejected", "fingerprintUsed"?, "notes"? }`  
**Response 200**
```json
{
  "verification": { full verification object with status, verifiedAt, verifiedByUserId set }
}
```
**404:** `{ "error": "Verification not found or already processed" }`

---

## 9. Payroll runs (auth)

### `GET /payroll-runs` (auth)
**Query:** `period_month`, `period_year`, `status`, `limit`, `offset`  
**Response 200**
```json
{
  "payrollRuns": [
    {
      "id": 1,
      "periodMonth": 2,
      "periodYear": 2026,
      "status": "draft | report_uploaded | audit_pending | audit_approved | auth_pending | auth_approved | payment_pending | payment_done | reconciled",
      "budgetTotal": "650000000",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### `GET /payroll-runs/:id` (auth)
**Response 200**
```json
{
  "payrollRun": {
    "id": 1,
    "periodMonth": 2,
    "periodYear": 2026,
    "status": "draft",
    "budgetTotal": "650000000",
    "createdAt": "string",
    "updatedAt": "string"
  },
  "steps": [
    {
      "id": 1,
      "payrollRunId": 1,
      "stepOrder": 1,
      "stepName": "report_uploaded",
      "completedAt": "string | null",
      "completedByUserId": null,
      "payload": null,
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```
**404:** `{ "error": "Payroll run not found" }`

### `POST /payroll-runs` (auth, Admin)
**Body:** `{ "periodMonth", "periodYear", "budgetTotal"? }`  
**Response 201**
```json
{
  "payrollRun": {
    "id": 1,
    "periodMonth": 2,
    "periodYear": 2026,
    "status": "draft",
    "budgetTotal": null,
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### `PUT /payroll-runs/:id/step` (auth)
**Body:** `{ "stepName": "report_uploaded" | "audit_approved" | "auth_approved" | "payment_done" | "reconciled", "payload"? }`  
**Response 200**
```json
{
  "payrollRun": { updated run object },
  "stepCompleted": "report_uploaded"
}
```

### `POST /payroll-runs/:id/generate-payslips` (auth, Admin)
**Response 200**
```json
{
  "message": "Payslips generated",
  "count": 8,
  "created": 8,
  "payslips": [
    {
      "id": 1,
      "employeeId": 1,
      "payrollRunId": 1,
      "gross": "5000.00",
      "deductions": "0",
      "net": "5000.00",
      "paidAt": null,
      "createdAt": "string"
    }
  ]
}
```

---

## 10. Payroll reports (auth)

### `GET /payroll-reports` (auth)
**Query:** `payroll_run_id`, `ministry_id`, `period_month`, `period_year`, `report_type`, `limit`  
**Response 200**
```json
{
  "reports": [
    {
      "id": 1,
      "payrollRunId": null,
      "ministryId": null,
      "periodMonth": 2,
      "periodYear": 2026,
      "reportType": "monthly | audit | authorisation | payment | reconciliation",
      "fileUrl": "string | null",
      "fileName": "string | null",
      "uploadedByUserId": null,
      "createdAt": "string"
    }
  ]
}
```

### `GET /payroll-reports/:id` (auth)
**Response 200**
```json
{
  "report": {
    "id": 1,
    "payrollRunId": null,
    "ministryId": null,
    "periodMonth": 2,
    "periodYear": 2026,
    "reportType": "monthly",
    "fileUrl": null,
    "fileName": null,
    "uploadedByUserId": null,
    "createdAt": "string"
  }
}
```
**404:** `{ "error": "Report not found" }`

### `GET /payroll-reports/:id/file` (auth)
**Description:** Download the report file when it was uploaded as base64.  
**Response 200:** Binary file (e.g. PDF) with headers `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="..."`.  
**404:** `{ "error": "Report file not found" }` (no base64 stored for this report).

### `POST /payroll-reports` (auth, Admin)
**Approach (choose one):**
1. **Base64 (inline):** Send `fileBase64` (string) and `fileName` in the JSON body. The backend stores the file and sets `fileUrl` to the download URL (`/payroll-reports/:id/file`).
2. **External URL:** Frontend uploads file to cloud storage, then sends `fileUrl` and optional `fileName` here.

**Body (JSON):** `{ "periodMonth", "periodYear", "reportType", "payrollRunId"?, "ministryId"?, "fileUrl"?, "fileName"?, "fileBase64"? }`  
- If `fileBase64` is provided, `fileName` is **required**.  
**Response 201**
```json
{
  "report": {
    "id": 1,
    "payrollRunId": null,
    "ministryId": null,
    "periodMonth": 2,
    "periodYear": 2026,
    "reportType": "monthly",
    "fileUrl": "https://.../payroll-reports/1/file",
    "fileName": "report-fevrier-2026.pdf",
    "uploadedByUserId": 1,
    "createdAt": "string"
  }
}
```
**400:** `fileName is required when fileBase64 is provided` if base64 is sent without fileName.

### `POST /payroll-reports/upload` (auth, Admin) — Alternative
**Approach:** Backend handles file upload directly (requires cloud storage configured).  
**Body (multipart/form-data):** `file` (File), `periodMonth`, `periodYear`, `reportType`, `payrollRunId?`, `ministryId?`  
**Response 201** (if storage configured) or **501** (if not configured)  
**Note:** Currently returns 501. To enable, configure cloud storage (Vercel Blob, S3, etc.) and implement upload logic. See `FILE_UPLOAD_GUIDE.md` for details.

---

## 11. Budgets (auth)

### `GET /budgets` (auth)
**Query:** `ministry_id`, `department_id`, `period_month`, `period_year`  
**Response 200**
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
      "allocatedAt": "string",
      "createdAt": "string",
      "ministryName": "string | null",
      "departmentName": "string | null"
    }
  ]
}
```

### `GET /budgets/:id` (auth)
**Response 200**
```json
{
  "budget": {
    "id": 1,
    "ministryId": 1,
    "departmentId": null,
    "periodMonth": 2,
    "periodYear": 2026,
    "amount": "300000000",
    "allocatedAt": "string",
    "createdAt": "string",
    "ministryName": "string | null",
    "departmentName": "string | null"
  }
}
```
**404:** `{ "error": "Budget not found" }`

### `POST /budgets` (auth, Admin)
**Body:** `{ "ministryId", "periodMonth", "periodYear", "amount", "departmentId"? }`  
**Response 201**
```json
{
  "budget": { "id", "ministryId", "departmentId", "periodMonth", "periodYear", "amount", "allocatedAt", "createdAt" }
}
```

### `PUT /budgets/:id` (auth, Admin)
**Body:** `{ "amount"?, "departmentId"? }`  
**Response 200**
```json
{
  "budget": { full budget object }
}
```

### `DELETE /budgets/:id` (auth, Admin)
**Response 200**
```json
{
  "message": "Budget deleted"
}
```

---

## 12. Payslips (auth)

### `GET /payslips` (auth)
**Query:** `payroll_run_id` **or** `employee_id` (one required), `limit`, `offset`  
**Response 200**
```json
{
  "payslips": [
    {
      "id": 1,
      "employeeId": 1,
      "payrollRunId": 1,
      "gross": "5000.00",
      "deductions": "0",
      "net": "5000.00",
      "paidAt": null,
      "createdAt": "string",
      "employeeName": "string | null",
      "employeeSurname": "string | null",
      "employeeNumber": "string | null",
      "periodMonth": 2,
      "periodYear": 2026
    }
  ]
}
```
**400:** `{ "error": "Provide payroll_run_id or employee_id" }`

### `GET /payslips/:id` (auth)
**Response 200**
```json
{
  "payslip": {
    "id": 1,
    "employeeId": 1,
    "payrollRunId": 1,
    "gross": "5000.00",
    "deductions": "0",
    "net": "5000.00",
    "paidAt": null,
    "createdAt": "string",
    "employee": { full employee object },
    "periodMonth": 2,
    "periodYear": 2026,
    "ministryName": "string | null"
  }
}
```
**404:** `{ "error": "Payslip not found" }`

### `PUT /payslips/:id/paid` (auth, Admin)
**Response 200**
```json
{
  "payslip": { full payslip object with "paidAt" set }
}
```
**404:** `{ "error": "Payslip not found" }`

---

## 13. Messages (auth)

### `GET /messages/employee/:employeeId` (auth)
**Query:** `type`, `unread_only`, `limit`  
**Response 200**
```json
{
  "messages": [
    {
      "id": 1,
      "employeeId": 1,
      "type": "pay_notification | sanction | promotion | deduction | general",
      "title": "string",
      "body": "string | null",
      "readAt": "string | null",
      "createdAt": "string"
    }
  ]
}
```

### `GET /messages/:id` (auth)
**Response 200**
```json
{
  "message": {
    "id": 1,
    "employeeId": 1,
    "type": "pay_notification",
    "title": "string",
    "body": "string | null",
    "readAt": null,
    "createdAt": "string"
  }
}
```
**404:** `{ "error": "Message not found" }`

### `POST /messages` (auth, Admin)
**Body:** `{ "employeeId", "type", "title", "body"? }`  
**Response 201**
```json
{
  "message": {
    "id": 1,
    "employeeId": 1,
    "type": "pay_notification",
    "title": "string",
    "body": null,
    "readAt": null,
    "createdAt": "string"
  }
}
```

### `PUT /messages/:id/read` (auth)
**Response 200**
```json
{
  "message": { full message object with "readAt" set }
}
```

---

## 14. Sanctions (auth)

### `GET /sanctions` (auth)
**Query:** `employee_id`, `limit`, `offset`  
**Response 200**
```json
{
  "sanctions": [
    {
      "id": 1,
      "employeeId": 1,
      "type": "string",
      "amountDeduction": "50",
      "reason": "string",
      "appliedAt": "string",
      "createdByUserId": null,
      "createdAt": "string",
      "employeeName": "string | null",
      "employeeSurname": "string | null",
      "employeeNumber": "string | null",
      "createdByName": "string | null",
      "createdBySurname": "string | null"
    }
  ]
}
```

### `GET /sanctions/:id` (auth)
**Response 200**
```json
{
  "sanction": {
    "id": 1,
    "employeeId": 1,
    "type": "string",
    "amountDeduction": "50",
    "reason": "string",
    "appliedAt": "string",
    "createdByUserId": null,
    "createdAt": "string",
    "employeeName": "string | null",
    "employeeSurname": "string | null",
    "employeeNumber": "string | null"
  }
}
```
**404:** `{ "error": "Sanction not found" }`

### `POST /sanctions` (auth, Admin)
**Body:** `{ "employeeId", "type", "reason", "amountDeduction"? }`  
**Response 201**
```json
{
  "sanction": {
    "id": 1,
    "employeeId": 1,
    "type": "string",
    "amountDeduction": "0",
    "reason": "string",
    "appliedAt": "string",
    "createdByUserId": 1,
    "createdAt": "string"
  }
}
```

---

## 15. Excel uploads (auth)

### `GET /excel-uploads` (auth)
**Query:** `ministry_id`, `upload_type`, `status`, `limit`  
**Response 200**
```json
{
  "uploads": [
    {
      "id": 1,
      "fileName": "string",
      "fileUrl": "string | null",
      "ministryId": null,
      "uploadType": "string",
      "rowsCount": 0,
      "status": "pending",
      "uploadedByUserId": null,
      "uploadedAt": "string",
      "ministryName": "string | null"
    }
  ]
}
```

### `GET /excel-uploads/:id` (auth)
**Response 200**
```json
{
  "upload": {
    "id": 1,
    "fileName": "string",
    "fileUrl": null,
    "ministryId": null,
    "uploadType": "string",
    "rowsCount": 0,
    "status": "pending",
    "uploadedByUserId": null,
    "uploadedAt": "string"
  }
}
```
**404:** `{ "error": "Upload not found" }`

### `POST /excel-uploads` (auth, Admin)
**Body:** `{ "fileName", "uploadType", "fileUrl"?, "ministryId"?, "rowsCount"? }`  
**Response 201**
```json
{
  "upload": { full upload object }
}
```

### `PUT /excel-uploads/:id/status` (auth, Admin)
**Body:** `{ "status": "string" }`  
**Response 200**
```json
{
  "upload": { full upload object with updated status }
}
```

---

## 16. Mobile money (auth)

### `GET /mobile-money/by-provider?provider=mpesa|airtel_money|orange_money` (auth)
**Query:** `provider` (required), `ministry_id`  
**Response 200**
```json
{
  "employees": [
    {
      "id": 1,
      "employeeNumber": "string",
      "name": "string",
      "surname": "string",
      "mobileMoneyProvider": "mpesa",
      "mobileMoneyNumber": "string",
      "salary": "1200.00",
      "ministryName": "string | null"
    }
  ],
  "provider": "mpesa"
}
```
**400:** `{ "error": "provider required: mpesa | airtel_money | orange_money" }`

### `GET /mobile-money/no-bank` (auth)
**Query:** `ministry_id`  
**Response 200**
```json
{
  "employees": [
    {
      "id": 1,
      "employeeNumber": "string",
      "name": "string",
      "surname": "string",
      "bankAccount": "string | null",
      "mobileMoneyProvider": "mpesa",
      "mobileMoneyNumber": "string",
      "ministryName": "string | null"
    }
  ]
}
```

### `POST /mobile-money/bulk-update` (auth, Admin)
**Body:** `{ "updates": [ { "employeeId", "provider", "mobileMoneyNumber" } ] }`  
**Response 200**
```json
{
  "message": "Bulk update completed",
  "updated": 5
}
```

---

## Error responses (all endpoints)

- **400:** `{ "error": "description" }` (validation, bad params)
- **401:** `{ "error": "Authorization token required" }` or `"Invalid or expired token"`
- **403:** `{ "error": "Admin access required" }` or similar
- **404:** `{ "error": "Resource not found" }` (e.g. "Employee not found")
- **409:** `{ "error": "description" }` (e.g. duplicate, conflict)
- **500:** `{ "error": "description", "detail"?: "string" }`

All timestamps are ISO 8601 strings (e.g. `"2026-02-22T12:00:00.000Z"`). Monetary values are returned as strings (e.g. `"5000.00"`, `"25000000"`) to avoid precision issues.

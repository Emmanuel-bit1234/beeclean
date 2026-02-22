# Guide: Upload de fichiers (Rapports PDF, Excel)

Ce guide explique **comment uploader des fichiers** (rapports PDF, fichiers Excel) dans le système de paie.

---

## Approche 1 : Envoyer le fichier en base64 (recommandé, sans stockage cloud)

Le frontend peut envoyer le fichier directement en base64 dans le body JSON. Aucun stockage cloud n’est nécessaire.

**POST** `/payroll-reports`  
**Body (JSON) :**
```json
{
  "payrollRunId": 1,
  "periodMonth": 2,
  "periodYear": 2026,
  "reportType": "monthly",
  "fileName": "report-fevrier-2026.pdf",
  "fileBase64": "JVBERi0xLjQKJ..."
}
```

**Exemple frontend (lire le fichier en base64) :**
```javascript
const file = fileInput.files[0];
const reader = new FileReader();
reader.onload = () => {
  const base64 = reader.result.split(',')[1]; // enlève le préfixe data:...;base64,
  fetch('/payroll-reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      periodMonth: 2,
      periodYear: 2026,
      reportType: 'monthly',
      fileName: file.name,
      fileBase64: base64,
    }),
  });
};
reader.readAsDataURL(file);
```

**Télécharger le rapport :**  
Le backend renvoie `report.fileUrl` pointant vers l’endpoint de téléchargement (ex. `https://.../payroll-reports/1/file`). Utilisez cette URL pour télécharger le fichier (avec le header `Authorization` si nécessaire).

---

## Approche 2 : Frontend upload vers un stockage cloud

Le frontend upload le fichier vers un service de stockage cloud et envoie l’URL au backend.

**Options de stockage :**
- **Vercel Blob** (recommandé si déployé sur Vercel)
- **AWS S3**
- **Cloudinary**
- **Google Cloud Storage**
- **Azure Blob Storage**
- Autre service compatible

**Exemple avec Vercel Blob (frontend) :**
```typescript
import { put } from '@vercel/blob';

const file = // File object from input
const blob = await put(file.name, file, { 
  access: 'public',
  token: process.env.BLOB_READ_WRITE_TOKEN 
});
const fileUrl = blob.url; // https://xxx.public.blob.vercel-storage.com/...
```

**POST** `/payroll-reports`  
**Body (JSON) :**
```json
{
  "payrollRunId": 1,
  "periodMonth": 2,
  "periodYear": 2026,
  "reportType": "monthly",
  "fileUrl": "https://xxx.public.blob.vercel-storage.com/report-fevrier-2026.pdf",
  "fileName": "report-fevrier-2026.pdf"
}
```

**Réponse 201 :**
```json
{
  "report": {
    "id": 1,
    "payrollRunId": 1,
    "periodMonth": 2,
    "periodYear": 2026,
    "reportType": "monthly",
    "fileUrl": "https://...",
    "fileName": "report-fevrier-2026.pdf",
    "uploadedByUserId": 1,
    "createdAt": "2026-02-22T12:00:00.000Z"
  }
}
```

### Télécharger le rapport

- **Rapport envoyé en base64 :** utiliser `report.fileUrl` (lien vers `/payroll-reports/:id/file`).
- **Rapport avec URL externe :** ouvrir `report.fileUrl` (lien cloud) dans un nouvel onglet ou pour téléchargement.

---

## Approche alternative (backend gère l’upload)

Si vous préférez que le backend gère l’upload directement, vous devez :

1. **Configurer un stockage cloud** (Vercel Blob, S3, etc.)
2. **Installer le SDK** correspondant (ex. `@vercel/blob`, `@aws-sdk/client-s3`)
3. **Implémenter l’endpoint** `/payroll-reports/upload` qui accepte `multipart/form-data`

### Exemple avec Vercel Blob (backend)

**1. Installer :**
```bash
pnpm add @vercel/blob
```

**2. Configurer la variable d’environnement :**
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx...
```

**3. Modifier `src/routes/payroll-reports.ts` :**
```typescript
import { put } from '@vercel/blob';

route.post('/upload', authMiddleware, adminMiddleware, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const periodMonth = Number(formData.get('periodMonth'));
  const periodYear = Number(formData.get('periodYear'));
  const reportType = formData.get('reportType') as string;
  
  // Upload to Vercel Blob
  const blob = await put(`reports/${periodYear}-${periodMonth}-${Date.now()}.pdf`, file, {
    access: 'public',
  });
  
  // Save metadata to DB
  const [created] = await db.insert(payrollReports).values({
    periodMonth,
    periodYear,
    reportType,
    fileUrl: blob.url,
    fileName: file.name,
    uploadedByUserId: c.get('user').id,
  }).returning();
  
  return c.json({ report: created }, 201);
});
```

**4. Frontend appelle :**
```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('periodMonth', '2');
formData.append('periodYear', '2026');
formData.append('reportType', 'monthly');
formData.append('payrollRunId', '1');

fetch('/payroll-reports/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData,
});
```

---

## Recommandation

**Pour envoyer un fichier sans configurer de stockage cloud,** utilisez l’**approche 1 (base64)** : le frontend envoie `fileBase64` et `fileName` dans le body JSON ; le backend stocke le fichier et renvoie une URL de téléchargement.

**Si vous préférez un stockage externe,** utilisez l’**approche 2 (frontend upload vers cloud)** : le frontend uploade vers S3/Vercel Blob/etc., puis envoie `fileUrl` et `fileName` au backend.

L’option **multipart** (`POST /payroll-reports/upload`) peut être activée plus tard si un stockage cloud est configuré côté backend.

---

## Même principe pour Excel Uploads

**POST** `/excel-uploads` fonctionne de la même manière :
- Frontend upload vers cloud storage, obtient URL
- Appelle l’API avec `{ fileName, fileUrl, uploadType, ministryId?, rowsCount? }`

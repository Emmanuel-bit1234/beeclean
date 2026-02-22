# Mapping écrans → API (Système de Paie RDC)

Ce document indique **quels appels API faire** pour chaque écran du frontend et **quelles données** utiliser.  
Tous les endpoints (sauf `/`, `/roles`, `/auth/login`, `/auth/register`) nécessitent l’en-tête : **`Authorization: Bearer <token>`**.

**Base URL :** `https://beeclean-eight.vercel.app`

---

## 1. Tableau de bord (Dashboard)

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Toute la page | GET | `/dashboard` | Réponse unique contient tout |

**Réponse → affichage :**
- **Total Employés** → `totalEmployees`
- **Budget total / 0 FC dépensés** → `totalBudget` (en FC) et `totalBudgetSpent`
- **Paies actives** → `activePayrolls`
- **Vérifications (en attente)** → `pendingVerifications`
- **Paiements à venir** → `upcomingPayments[]` (ministryName, paymentDate, employeeCount, amountFC)
- **Activités récentes** → `recentActivities[]` (label, status, at)
- **Statut (Workflow, Vérifications, Messages)** → `systemStatus` et `unreadMessages`

---

## 2. Vérification des Employés

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Liste des vérifications en attente | GET | `/employee-verifications/pending` | `verifications[]` |
| Filtre par étape | GET | `/employee-verifications/pending?step=...` | idem |
| Vérifications d’un employé | GET | `/employee-verifications/employee/:employeeId` | `verifications[]` (step, status, verifiedAt, verifiedByUserName, etc.) |
| Créer une étape de vérification (Admin) | POST | `/employee-verifications` | Body: `{ "employeeId", "step", "notes"? }` → `verification` |
| Approuver / Rejeter | PUT | `/employee-verifications/:id/approve` | Body: `{ "status": "approved" \| "rejected", "fingerprintUsed"? }` → `verification` |

Pour afficher la liste des employés (pour choisir un employé ou son numéro) : **GET** `/employees` (voir écran Position et Salaire).

---

## 3. Position et Salaire

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Liste des employés | GET | `/employees` | `employees[]`, `total`, `limit`, `offset` |
| Filtres | GET | `/employees?ministry_id=&department_id=&status=&search=&limit=&offset=` | idem |
| Détail d’un employé (position + salaire) | GET | `/employees/:id` | `employee` (position, salary, ministryName, departmentName, status, bankAccount, mobileMoney…) |
| Créer un employé (Admin) | POST | `/employees` | Body: ministryId, name, surname, position, salary, … (pas besoin d’envoyer `employeeNumber` : il est généré automatiquement à partir du ministère, ex. FIN-001, BUD-002) → `employee` |
| Modifier position / salaire (Admin) | PUT | `/employees/:id` | Body: position?, salary?, status?, … → `employee` |
| Supprimer (Admin) | DELETE | `/employees/:id` | — |

Pour les listes déroulantes :
- **Ministères** → **GET** `/ministries` → `ministries[]`
- **Départements** → **GET** `/departments` ou `/departments?ministry_id=` → `departments[]`

---

## 4. Traitement de la Paie (Payroll Processing)

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Liste des cycles de paie | GET | `/payroll-runs` | `payrollRuns[]`, `total` |
| Filtres | GET | `/payroll-runs?period_month=&period_year=&status=&limit=&offset=` | idem |
| Détail d’un cycle + étapes | GET | `/payroll-runs/:id` | `payrollRun`, `steps[]` |
| Créer un cycle (Admin) | POST | `/payroll-runs` | Body: `{ "periodMonth", "periodYear", "budgetTotal"? }` → `payrollRun` |
| Avancer l’étape (report → audit → auth → payment → reconcile) | PUT | `/payroll-runs/:id/step` | Body: `{ "stepName": "report_uploaded" \| "audit_approved" \| "auth_approved" \| "payment_done" \| "reconciled" }` → `payrollRun`, `stepCompleted` |
| Générer les bulletins (Admin) | POST | `/payroll-runs/:id/generate-payslips` | → `count`, `payslips[]` |
| Liste des bulletins du cycle | GET | `/payslips?payroll_run_id=:id` | `payslips[]` |
| Marquer un bulletin comme payé (Admin) | PUT | `/payslips/:id/paid` | → `payslip` |

**Rapports (PDF) liés au cycle :**
- Lister → **GET** `/payroll-reports?payroll_run_id=:id` → `reports[]`
- Déposer un rapport (plusieurs options) :
  - **Option base64 (recommandée, sans cloud) :** **POST** `/payroll-reports` avec `{ periodMonth, periodYear, reportType, fileName, fileBase64 }`. Le backend stocke le fichier et renvoie `fileUrl` pointant vers **GET** `/payroll-reports/:id/file` pour le téléchargement.
  - **Option URL externe :** Frontend upload le fichier vers un stockage cloud (S3, Vercel Blob, etc.), obtient l’URL, puis appelle **POST** `/payroll-reports` avec `{ payrollRunId?, ministryId?, periodMonth, periodYear, reportType, fileUrl, fileName }`.
  - **Option multipart (à configurer) :** **POST** `/payroll-reports/upload` avec `multipart/form-data`. Nécessite un stockage cloud configuré côté backend.

### Comment fonctionne le Traitement de la Paie (workflow)

1. **Choix de la période (ex. février 2026)**  
   - Appeler **GET** `/payroll-runs?period_month=2&period_year=2026`.  
   - S’il n’y a aucun cycle → afficher « Aucune paie trouvée pour cette période » et le bouton **Créer un cycle de paie**.

2. **Créer un cycle de paie**  
   - Au clic sur « Créer un cycle de paie », envoyer **POST** `/payroll-runs` avec `{ "periodMonth": 2, "periodYear": 2026, "budgetTotal": "..." }` (optionnel).  
   - Le cycle est créé en statut **Brouillon** (`draft`).  
   - Afficher **Période** (ex. février 2026), **Montant total** (`payrollRun.budgetTotal`), **Statut** (`payrollRun.status` → ex. « Brouillon »).

3. **Workflow en 5 étapes (validation à chaque étape)**  
   - **Étape 1 – Rapport :** Le rapport du mois doit être lu et accepté. Déposer un rapport (PDF) via **POST** `/payroll-reports`, puis valider l’étape avec **PUT** `/payroll-runs/:id/step` et `{ "stepName": "report_uploaded" }`.  
   - **Étape 2 – Audit (Ministère du Budget) :** Vérification du rapport. Valider avec `{ "stepName": "audit_approved" }`.  
   - **Étape 3 – Autorisation (Ministère des Finances) :** Autorisation de paiement. Valider avec `{ "stepName": "auth_approved" }`.  
   - **Étape 4 – Paiement (Banque) :** Générer les bulletins si besoin (**POST** `/payroll-runs/:id/generate-payslips`), puis marquer les bulletins payés (**PUT** `/payslips/:id/paid`). Ensuite valider avec `{ "stepName": "payment_done" }`.  
   - **Étape 5 – Réconciliation :** Le rapport de paie se ferme et doit correspondre au budget. Valider avec `{ "stepName": "reconciled" }`.

4. **Résumé à afficher (Période, Montant total, Statut)**  
   - Pour la période choisie : **GET** `/payroll-runs?period_month=&period_year=` → prendre le premier `payrollRun` (ou **GET** `/payroll-runs/:id` si vous avez déjà l’id).  
   - **Période** = `periodMonth` / `periodYear` (ex. « février 2026 »).  
   - **Montant total** = `budgetTotal` (ou somme des payslips si vous la calculez côté front).  
   - **Statut** = `status` (draft → Brouillon, report_uploaded, audit_approved, auth_approved, payment_done, reconciled).

5. **Télécharger le rapport**  
   - **GET** `/payroll-reports?payroll_run_id=:id` pour lister les rapports du cycle.  
   - Chaque `report` a `fileUrl` et `fileName` : utiliser `fileUrl` pour le lien de téléchargement (ou ouvrir dans un nouvel onglet).

6. **Notes de réconciliation**  
   - Texte informatif côté UI uniquement. Après « payment_done », l’étape « reconciled » sert à clôturer le cycle et à aligner avec le budget ; les corrections (ex. taxes) peuvent être gérées via budgets / rapports.

---

## 5. Gestion Budgétaire (Budget Management)

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Liste des budgets | GET | `/budgets` | `budgets[]` |
| Filtres | GET | `/budgets?ministry_id=&department_id=&period_month=&period_year=` | idem |
| Détail d’un budget | GET | `/budgets/:id` | `budget` (amount, ministryName, departmentName, periodMonth, periodYear) |
| Créer un budget (Admin) | POST | `/budgets` | Body: `{ "ministryId", "periodMonth", "periodYear", "amount", "departmentId"? }` → `budget` |
| Modifier un budget (Admin) | PUT | `/budgets/:id` | Body: `{ "amount"? }` → `budget` |
| Supprimer (Admin) | DELETE | `/budgets/:id` | — |

Pour les listes déroulantes :
- **Ministères** → **GET** `/ministries` → `ministries[]`
- **Départements** → **GET** `/departments?ministry_id=` → `departments[]`

---

## 6. Messages

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Messages d’un employé | GET | `/messages/employee/:employeeId` | `messages[]` |
| Filtres | GET | `/messages/employee/:employeeId?type=&unread_only=true&limit=` | idem |
| Détail d’un message | GET | `/messages/:id` | `message` |
| Envoyer un message (Admin) | POST | `/messages` | Body: `{ "employeeId", "type", "title", "body"? }` (type: pay_notification, sanction, promotion, deduction, general) → `message` |
| Marquer comme lu | PUT | `/messages/:id/read` | → `message` |

Pour choisir l’employé : **GET** `/employees` (voir Position et Salaire).

---

## 7. Import Excel

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Liste des imports | GET | `/excel-uploads` | `uploads[]` |
| Filtres | GET | `/excel-uploads?ministry_id=&upload_type=&status=` | idem |
| Détail d’un import | GET | `/excel-uploads/:id` | `upload` |
| Enregistrer un import (Admin) | POST | `/excel-uploads` | Body: `{ "fileName", "uploadType", "fileUrl"? }` → `upload` |
| Mettre à jour le statut (Admin) | PUT | `/excel-uploads/:id/status` | Body: `{ "status" }` → `upload` |

Le fichier lui-même est hébergé ailleurs ; l’API stocke uniquement les métadonnées (fileName, fileUrl, uploadType, status, etc.).

---

## 8. Rapports (Reports)

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Liste des rapports | GET | `/payroll-reports` | `reports[]` |
| Filtres | GET | `/payroll-reports?payroll_run_id=&ministry_id=&period_month=&period_year=&report_type=` | idem |
| Détail d’un rapport | GET | `/payroll-reports/:id` | `report` (reportType, fileUrl, fileName, periodMonth, periodYear) |
| Télécharger le fichier (si envoyé en base64) | GET | `/payroll-reports/:id/file` | Fichier binaire (PDF) |
| Déposer un rapport (Admin) | POST | `/payroll-reports` | Body: periodMonth, periodYear, reportType, payrollRunId?, ministryId?, fileUrl?, fileName? **ou** fileBase64 + fileName → `report` |

**reportType :** `monthly` \| `audit` \| `authorisation` \| `payment` \| `reconciliation`

Pour les sanctions / déductions (rapports ou listes) :
- **GET** `/sanctions` ou `/sanctions?employee_id=` → `sanctions[]`

---

## 9. Mon Profil

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Utilisateur connecté | GET | `/auth/me` | `user` (id, email, name, surname, role) |
| Modifier son profil | PUT | `/users/:id` | Body: name?, surname?, email? (id = user.id) → `user` |

---

## 10. Paiements mobile (M-Pesa / Airtel / Orange)

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Employés par opérateur | GET | `/mobile-money/by-provider?provider=mpesa` (ou `airtel_money`, `orange_money`) | `employees[]`, `provider` |
| Filtre par ministère | GET | `/mobile-money/by-provider?provider=mpesa&ministry_id=` | idem |
| Employés avec mobile money (sans banque) | GET | `/mobile-money/no-bank` | `employees[]` |
| Mise à jour en masse (Admin) | POST | `/mobile-money/bulk-update` | Body: `{ "updates": [ { "employeeId", "provider", "mobileMoneyNumber" } ] }` → `updated` |

---

## 11. Paramètres (Settings)

| Besoin | Méthode | URL | Données à afficher |
|--------|--------|-----|--------------------|
| Liste des rôles (pour formulaires) | GET | `/roles` | `roles[]` |
| Liste des utilisateurs (Admin) | GET | `/users` | `users[]`, `total` |
| Modifier le rôle d’un utilisateur (Admin) | PUT | `/users/:id/role` | Body: `{ "role" }` → `user` |
| Ministères (pour config) | GET | `/ministries` | `ministries[]` |
| Départements | GET | `/departments` | `departments[]` |

---

## Récapitulatif par écran

| Écran | Endpoints principaux |
|-------|----------------------|
| **Tableau de bord** | `GET /dashboard` |
| **Vérification des Employés** | `GET /employee-verifications/pending`, `GET /employee-verifications/employee/:employeeId`, `POST /employee-verifications`, `PUT /employee-verifications/:id/approve`, `GET /employees` |
| **Position et Salaire** | `GET /employees`, `GET /employees/:id`, `POST /employees`, `PUT /employees/:id`, `GET /ministries`, `GET /departments` |
| **Traitement de la Paie** | `GET /payroll-runs`, `GET /payroll-runs/:id`, `POST /payroll-runs`, `PUT /payroll-runs/:id/step`, `POST /payroll-runs/:id/generate-payslips`, `GET /payslips?payroll_run_id=`, `PUT /payslips/:id/paid`, `GET /payroll-reports`, `POST /payroll-reports` |
| **Gestion Budgétaire** | `GET /budgets`, `GET /budgets/:id`, `POST /budgets`, `PUT /budgets/:id`, `DELETE /budgets/:id`, `GET /ministries`, `GET /departments` |
| **Messages** | `GET /messages/employee/:employeeId`, `GET /messages/:id`, `POST /messages`, `PUT /messages/:id/read`, `GET /employees` |
| **Import Excel** | `GET /excel-uploads`, `GET /excel-uploads/:id`, `POST /excel-uploads`, `PUT /excel-uploads/:id/status` |
| **Rapports** | `GET /payroll-reports`, `GET /payroll-reports/:id`, `POST /payroll-reports`, `GET /sanctions` |
| **Mon Profil** | `GET /auth/me`, `PUT /users/:id` |
| **Paramètres** | `GET /roles`, `GET /users`, `PUT /users/:id/role`, `GET /ministries`, `GET /departments` |
| **Paiements mobile** | `GET /mobile-money/by-provider?provider=`, `GET /mobile-money/no-bank`, `POST /mobile-money/bulk-update` |

Pour le détail exact des corps de requête et des réponses (formats JSON), voir **API_RESPONSES.md**.

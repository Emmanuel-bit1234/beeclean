# Ministères, départements et positions – structure fonctionnelle

Ce document décrit **comment la structure organisationnelle** (Ministères → Directions / Divisions → Postes) est modélisée dans la base de données du système de paie RDC, et comment le frontend doit l’utiliser.

---

## 1. Tables concernées

- `ministries` – Ministères (FIN, BUD, FONC, EMP, …)
- `departments` – Directions / Divisions / Services à l’intérieur d’un ministère
  - `ministryId`, `name`, `code`, `budgetMonthly`
- `employees` – Agents avec:
  - `ministryId`, `departmentId`, `position`, `salary`, `status`, `email`, `bankAccount`, etc.
- `users` – Comptes d’accès au système, avec `role` (voir `ROLES.md`).

**Idée clé :**

- La **structure hiérarchique** est modélisée par:
  - `ministries` + `departments` (codes stables, par ministère).
- Les **postes / fonctions concrètes** sont:
  - `employees.position` (texte libre mais guidé par l’UI),
  - `users.role` (rôle technique pour les droits d’accès).

---

## 2. Ministères (déjà en base) – endpoints

Dans le seed (`scripts/seed.ts`), les ministères suivants existent déjà :

- `FIN` – Ministère des Finances  
- `BUD` – Ministère du Budget  
- `FONC` – Ministère de la Fonction Publique  
- `EMP` – Ministère de l’Emploi et Travail  
- (et d’autres : Défense Nationale, Santé Publique, …)

Chaque ministère a un `code` (ex: `FIN`) utilisé pour les départements et l’auto‑génération des matricules (`FIN-001`, etc.).

### 2.1 `GET /ministries` (auth)

**Objectif UI :** remplir les listes déroulantes de ministères (ex. création d’employé, filtres du Tableau de bord, Traitement de la Paie, Budgets).

**Requête :**

```http
GET /ministries?sector=&payment_day=&search=
Authorization: Bearer <token>
```

**Paramètres de requête :**

- `sector` (optionnel) – filtre sur `sectorCategory`.  
- `payment_day` (optionnel) – filtre sur `paymentDayOfMonth`.  
- `search` (optionnel) – recherche plein texte sur `name`, `code`, `sectorCategory`.

**Réponse 200 (extrait) :**

```json
{
  "ministries": [
    {
      "id": 1,
      "name": "Ministère du Budget",
      "code": "BUD",
      "sectorCategory": "Finances / Économie",
      "paymentDayOfMonth": 24,
      "createdAt": "2026-02-22T12:00:00.000Z",
      "updatedAt": "2026-02-22T12:00:00.000Z"
    }
  ]
}
```

### 2.2 `GET /ministries/:id` (auth)

**Objectif UI :** afficher le détail d’un ministère (fiche, code, jour de paiement, etc.).

**Réponse 200 :** `{ "ministry": { ... } }` avec les mêmes champs que ci‑dessus.  
**404 :** `{ "error": "Ministry not found" }`.

---

## 3. Départements – structure détaillée par ministère

Un script dédié (`scripts/seed_departments_structure.ts`) insère une structure détaillée dans `departments` **sans casser l’existant** (il ne crée une ligne que si le `code` n’existe pas déjà pour le ministère).

### 3.0 Endpoints départements

#### `GET /departments` (auth)

**Objectif UI :** listes déroulantes de directions / services par ministère, écrans de Paramètres.

**Requête :**

```http
GET /departments?ministry_id=<id>
Authorization: Bearer <token>
```

**Réponse 200 :**

```json
{
  "departments": [
    {
      "id": 1,
      "ministryId": 1,
      "name": "Direction de la Préparation Budgétaire",
      "code": "BUD-DPB",
      "budgetMonthly": "50000000",
      "ministryName": "Ministère du Budget",
      "ministryCode": "BUD"
    }
  ]
}
```

#### `GET /departments/:id` (auth)

**Objectif UI :** fiche d’une direction (si nécessaire).  
**Réponse 200 :** `{ "department": { ... } }` avec `name`, `code`, `budgetMonthly`, `ministryName`, `ministryCode`.  
**404 :** `{ "error": "Department not found" }`.

### 3.1 Ministère de l’Emploi et Travail (`EMP`)

- `EMP-CAB` – Cabinet du Ministre  
- `EMP-SG` – Secrétariat Général  
- `EMP-DRH` – Direction des Ressources Humaines  
- `EMP-DFP` – Direction de la Fonction Publique / Administration du Personnel  
- `EMP-DRP` – Direction des Relations Professionnelles / Inspection du Travail  
- `EMP-DSI` – Direction Informatique / Systèmes d’Information  
- `EMP-DAF` – Direction de l’Administration et des Finances  
- `EMP-JUR` – Service Juridique / Conformité  

### 3.2 Ministère du Budget (`BUD`)

- `BUD-CAB` – Cabinet du Ministre  
- `BUD-SG` – Secrétariat Général  
- `BUD-DPB` – Direction de la Préparation Budgétaire  
- `BUD-DEB` – Direction de l’Exécution Budgétaire  
- `BUD-DCB` – Direction du Contrôle Budgétaire / Audit Budgétaire  
- `BUD-DSI` – Direction Informatique / Statistiques Budgétaires  
- `BUD-DAF` – Direction de l’Administration et des Finances  
- `BUD-JUR` – Service Juridique / Conformité  

### 3.3 Ministère des Finances (`FIN`)

- `FIN-CAB` – Cabinet du Ministre  
- `FIN-SG` – Secrétariat Général  
- `FIN-DTR` – Direction du Trésor / Gestion de la Trésorerie  
- `FIN-DCP` – Direction de la Comptabilité Publique  
- `FIN-DIMP` – Direction des Impôts / Retenues  
- `FIN-DSI` – Direction des Systèmes d’Information / Cybersécurité  
- `FIN-DAF` – Direction de l’Administration et des Finances  
- `FIN-JUR` – Service Juridique / Conformité  

### 3.4 Ministère de la Fonction Publique (`FONC`)

- `FONC-REG` – Direction Identification / Matricule  
- `FONC-CARR` – Direction des Carrières  
- `FONC-DISC` – Direction Discipline  
- `FONC-CONT` – Direction Contrôle / Inspection  
- `FONC-DSI` – Direction Informatique / Enrôlement biométrique  
- `FONC-DAF` – Direction de l’Administration et des Finances  
- `FONC-JUR` – Service Juridique / Conformité  

Ces codes peuvent être utilisés dans le frontend pour filtrer/segmenter par niveau (Cabinet, SG, DRH, Trésor, etc.).

---

## 4. Postes / fonctions (employees.position) – endpoints employés

Les listes de postes (Ministre, Vice‑Ministre, Directeur, Chef de Division, Inspecteur, Analyste, etc.) **ne nécessitent pas de table dédiée** dans la DB. Elles sont gérées au niveau UI, mais stockées en clair dans `employees.position`.

Exemples par département :

- `EMP-DRH` (Direction des Ressources Humaines) :  
  - Directeur des Ressources Humaines  
  - Chef de Division Gestion administrative  
  - Chef de Division Recrutement & Mobilité  
  - Chef de Division Formation & Développement  
  - Chef de Bureau / Agent RH  

- `BUD-DPB` (Préparation Budgétaire) :  
  - Directeur  
  - Chef de Division Cadrage macroéconomique & Prévisions  
  - Chef de Division Répartition par secteurs  
  - Chef de Division Calendrier budgétaire  

- `FIN-DTR` (Trésor) :  
  - Directeur du Trésor  
  - Opérateur de trésorerie  
  - Autorisateur de trésorerie / paiement  
  - Agent de réconciliation  

Le frontend peut proposer des **listes déroulantes de postes suggérés** en fonction du `department.code`, mais au final, le champ stocké est simplement `employees.position` (texte).

### 4.1 `GET /employees` (auth)

**Objectif UI :** lister les agents (Position & Salaire, Vérification des employés, filtres par ministère/département).

**Requête :**

```http
GET /employees?ministry_id=&department_id=&status=&search=&limit=&offset=
Authorization: Bearer <token>
```

- `ministry_id` – filtre par ministère.  
- `department_id` – filtre par département.  
- `status` – `active | suspended | deceased | retired`.  
- `search` – recherche sur nom, prénom, matricule, poste.  
- `limit`, `offset` – pagination.

**Réponse 200 (simplifiée) :**

```json
{
  "employees": [
    {
      "id": 1,
      "ministryId": 1,
      "departmentId": 3,
      "employeeNumber": "FIN-001",
      "name": "Jean",
      "surname": "Kabongo",
      "email": "jean@exemple.cd",
      "position": "Directeur de la Paie",
      "salary": "5000.00",
      "status": "active",
      "bankAccount": "1234567890",
      "bankName": "Rawbank",
      "mobileMoneyProvider": "none",
      "mobileMoneyNumber": null,
      "verifiedAt": null,
      "ministryName": "Ministère des Finances",
      "departmentName": "Direction du Trésor / Gestion de la Trésorerie"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### 4.2 `GET /employees/:id` (auth)

**Objectif UI :** vue « Position & Salaire » détaillée, fiche de l’agent.

**Réponse 200 :**

```json
{
  "employee": {
    "id": 1,
    "userId": null,
    "ministryId": 1,
    "departmentId": 3,
    "employeeNumber": "FIN-001",
    "name": "Jean",
    "surname": "Kabongo",
    "position": "Directeur de la Paie",
    "salary": "5000.00",
    "status": "active",
    "bankAccount": "1234567890",
    "bankName": "Rawbank",
    "mobileMoneyProvider": "none",
    "mobileMoneyNumber": null,
    "fingerprintHash": null,
    "faceHash": null,
    "verifiedAt": null,
    "verifiedByUserId": null,
    "createdAt": "2026-02-22T12:00:00.000Z",
    "updatedAt": "2026-02-22T12:00:00.000Z",
    "ministryName": "Ministère des Finances",
    "ministryCode": "FIN",
    "departmentName": "Direction de la Paie",
    "departmentCode": "FIN-DP"
  }
}
```

### 4.3 `POST /employees` (auth, Admin)

**Objectif UI :** créer un agent avec son ministère, sa direction, son poste et ses informations bancaires / mobile money.

Voir `employee_update_implementation.md` pour les détails complets. Rappel :

- Champs requis : `ministryId`, `name`, `surname`, `email`, `position`, `salary`, `bankAccount`, `bankName`.  
- `departmentId` – facultatif mais recommandé pour rattacher l’agent à une direction précise (ex. `FIN-DTR`, `BUD-DPB`, `EMP-DRH`, etc.).  
- `employeeNumber` – optionnel (généré automatiquement par ministère si absent).  
- Si `mobileMoneyProvider != 'none'`, `mobileMoneyNumber` est requis.

---

## 5. Rôles du système (users.role)

Les « rôles système » (droit d’accès) restent séparés dans `users.role` et sont décrits dans `ROLES.md` et via l’endpoint `GET /roles` (ex. `Directeur_Paie`, `Directeur_Budget`, `Agent`, etc.).

Usage recommandé :

- `employees.position` = **fonction administrative réelle** de l’agent (Ex: \"Directeur du Trésor\").  
- `users.role` = **profil technique** dans l’application (Ex: `Directeur_Paie`, `Admin`, `Agent`).  

Un même poste administratif peut être mappé à différents `users.role` selon les besoins, mais les listes de base sont déjà alignées avec la hiérarchie gouvernementale dans `types/roles.ts`.

---

## 6. Flow côté frontend

1. **Choix du ministère**  
   - `GET /ministries` → l’utilisateur choisit, par ex. « Ministère du Budget » (`code: BUD`).  

2. **Choix du département / direction**  
   - `GET /departments?ministry_id=<id>` → affiche les lignes `BUD-CAB`, `BUD-SG`, `BUD-DPB`, `BUD-DEB`, `BUD-DCB`, `BUD-DSI`, `BUD-DAF`, `BUD-JUR`.  
   - L’utilisateur choisit, ex. `BUD-DPB` (Préparation Budgétaire).

3. **Choix du poste**  
   - L’UI propose une liste de postes prédéfinis pour ce département (d’après ce document), mais laisse un champ libre si nécessaire.  
   - Le poste choisi est envoyé comme `position` dans `POST /employees` ou `PUT /employees/:id`.

4. **Affectation d’un rôle système (optionnel)**  
   - Pour un compte utilisateur, l’admin choisit un `role` parmi `GET /roles` (ex: `Directeur_Budget`, `Agent`).  
   - Cela contrôle les autorisations (qui valide quoi dans le workflow de paie).

---

## 7. Script de seed

Pour (re)créer cette structure dans n’importe quel environnement, utiliser :

```bash
pnpm exec tsx scripts/seed_departments_structure.ts
```

Le script est **idempotent** : il ne crée un département que s’il n’existe pas déjà pour ce ministère (`code` + `ministryId`). Cela permet de garder la structure logique alignée avec les besoins métier sans casser les données existantes.


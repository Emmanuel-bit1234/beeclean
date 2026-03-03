# Rôles – API reference

This document describes the **roles** endpoint used to list allowed RDC payroll roles (for registration, user management, and Paramètres).

---

## 1. What are roles?

Roles define a user’s position in the RDC government payroll hierarchy. They are used for:

- **Registration** – when creating a user, `role` must be one of the allowed values.
- **User management** – editing a user’s role (e.g. in Paramètres or admin screens).
- **Authorization** – some actions require specific roles (e.g. Admin, Directeur_Paie).

The list is fixed in the backend and aligned with:

- General government hierarchy (President → Vice-Ministres).
- Internal ministry structure (Directeur de Cabinet → Agents).
- Key payroll roles (Directeur Paie/Budget/Informatique).
- System role: **Admin** (full system access).

---

## 2. Endpoint

| Action     | Method | URL        | Auth  |
|-----------|--------|------------|--------|
| List roles | **GET** | `/roles` | **No** |

No query parameters. No request body.

---

## 3. GET /roles

**Request:**

```http
GET /roles
```

No `Authorization` header required.

**Response 200:**

```json
{
  "roles": [
    "Admin",
    "President",
    "Premier_Ministre",
    "VPM",
    "Ministre_Etat",
    "Ministre",
    "Ministre_Delegue",
    "Vice_Ministre",
    "Directeur_Cabinet",
    "Secretaire_General",
    "Directeur_Paie",
    "Directeur_Budget",
    "Directeur_Informatique",
    "Chef_Division",
    "Chef_Bureau",
    "Agent"
  ]
}
```

`roles` is an array of strings. Use it for dropdowns and validation.

---

## 4. Role list (reference)

| Role                   | Description (context) |
|------------------------|------------------------|
| `Admin`                | Full system access; not part of government hierarchy. |
| `President`            | Président de la République. |
| `Premier_Ministre`     | Premier Ministre. |
| `VPM`                  | Vice-Premiers Ministres. |
| `Ministre_Etat`        | Ministres d’État. |
| `Ministre`             | Ministre. |
| `Ministre_Delegue`     | Ministre Délégué. |
| `Vice_Ministre`        | Vice-Ministre. |
| `Directeur_Cabinet`    | Directeur de Cabinet. |
| `Secretaire_General`  | Secrétaire Général. |
| `Directeur_Paie`       | Directeur de la Paie (strategic payroll). |
| `Directeur_Budget`     | Directeur du Budget (strategic budget). |
| `Directeur_Informatique` | Directeur Informatique. |
| `Chef_Division`        | Chef de Division. |
| `Chef_Bureau`          | Chef de Bureau. |
| `Agent`                | Agent (default role for new users). |

---

## 5. Frontend usage

- **Registration:** Call `GET /roles`, then use `response.roles` as the options for the role field. Send the selected value as `role` in `POST /auth/register`.
- **User edit / Paramètres:** Same list for the role dropdown; send the chosen value in `PUT /users/:id` (e.g. `{ "role": "Directeur_Paie" }`).
- **Validation:** Only values in `roles` are valid for `role` in register and user update; the API returns 400 for invalid roles.

---

## 6. Summary

| Question | Answer |
|----------|--------|
| Endpoint | **GET /roles** |
| Auth?    | No. |
| Returns  | `{ "roles": ["Admin", "President", ... , "Agent"] }` |
| Use for  | Registration, user role edit, Paramètres dropdowns. |

This file is the single reference for the roles API.

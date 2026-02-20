-- RDC Payroll: align roles with government structure (hiérarchie + structure interne ministère)
-- Set default role to Agent; backfill legacy roles (Nurse, Doctor, User) to Agent; keep Admin
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'Agent';
UPDATE "users" SET "role" = 'Agent' WHERE "role" IN ('Nurse', 'Doctor', 'User');

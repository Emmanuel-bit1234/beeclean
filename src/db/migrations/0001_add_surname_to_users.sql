-- Add surname column for payroll (Name, Surname, email, role)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "surname" varchar(255) DEFAULT '' NOT NULL;

-- Add surname column for payroll (Name, Surname, email, role)
-- Idempotent: check if column exists before adding
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'surname'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "surname" varchar(255) DEFAULT '' NOT NULL;
    END IF;
END $$;

import { pgTable, serial, varchar, timestamp, text, integer, jsonb, real, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('Nurse').$type<'Admin' | 'Doctor' | 'Nurse' | 'User'>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});



export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;


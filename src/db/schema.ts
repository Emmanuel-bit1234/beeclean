import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';
import type { RdcPayrollRole } from '../types/roles.js';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  surname: varchar('surname', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('Agent').$type<RdcPayrollRole>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});



export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;


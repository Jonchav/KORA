import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tierEnum = pgEnum("tier", ["free", "mini", "plus", "pro"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(), // Google sub
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  picture: text("picture").notNull().default(""),
  tier: tierEnum("tier").notNull().default("free"),
  credits: integer("credits").notNull().default(10),
  monthlyResetAt: timestamp("monthly_reset_at", { withTimezone: true }).notNull().defaultNow(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

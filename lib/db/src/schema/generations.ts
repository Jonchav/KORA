import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const styleEnum = pgEnum("style", [
  "comic", "anime", "popart", "watercolor", "oilpainting",
  "cyberpunk", "pixel", "clay", "toy", "vaporwave", "fantasy", "gtasa", "dccomic",
  "fortnite", "luxury", "hollywood", "sims", "timetraveler",
  "matrix", "titanic", "starwars", "godfather", "madmax", "interstellar",
  "gatsby", "wonderwoman",
]);

export const formatEnum = pgEnum("format", ["square", "portrait", "story", "landscape"]);

export const generationsTable = pgTable("generations", {
  id: text("id").primaryKey(),           // jobId
  userId: text("user_id").notNull(),
  style: styleEnum("style").notNull(),
  format: formatEnum("format").notNull(),
  mode: text("mode").notNull().default("transform"), // "transform" | "generate"
  filePath: text("file_path"),           // absolute path on disk (null if not persisted yet)
  watermark: integer("watermark").notNull().default(0), // 0 = no, 1 = yes
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGenerationSchema = createInsertSchema(generationsTable);
export type InsertGeneration = z.infer<typeof insertGenerationSchema>;
export type Generation = typeof generationsTable.$inferSelect;

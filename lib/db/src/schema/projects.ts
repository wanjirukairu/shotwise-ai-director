import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

type StoredChatMessage = {
  role: "director" | "assistant";
  content: string;
};

type StoredShot = {
  id: string;
  shotNumber: number;
  shotType: string;
  framing: string;
  angle: string;
  lens: string;
  movement: string;
  lighting: string;
  composition: string;
  rationale: string;
  equipment: string[];
  crew: string[];
  setupTime: string;
  setupTimeOverride: string | null;
  locationRequirements: string;
  vfxRequirements: string;
  budgetImpact: string;
  feasibility: "easy" | "needs-time-or-gear" | "complex";
  alternative: string | null;
  sourceType: "practical" | "ai-generated";
  computeGenerationCost: string | null;
  modelTool: string | null;
  promptIterationTime: string | null;
  consistencyAcrossShots: string | null;
  upscalingPostNeeds: string | null;
  referenceExamples: Array<{
    title: string;
    work: string;
    medium: string;
    technique: string;
    url: string | null;
  }>;
  learningResources: Array<{
    title: string;
    kind: string;
    url: string;
  }>;
};

export const projectsTable = pgTable("shotwise_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  sceneText: text("scene_text").notNull(),
  resources: text("resources").notNull().default(""),
  projectType: text("project_type").notNull().default("live-action"),
  overallNotes: text("overall_notes").notNull().default(""),
  budget: text("budget").notNull().default(""),
  equipment: text("equipment").notNull().default(""),
  crewExperience: text("crew_experience").notNull().default(""),
  challengeMode: boolean("challenge_mode").notNull().default(false),
  messages: jsonb("messages").$type<StoredChatMessage[]>().notNull().default([]),
  shots: jsonb("shots").$type<StoredShot[]>().notNull().default([]),
  productionNotes: text("production_notes").notNull().default(""),
  readyToLock: boolean("ready_to_lock").notNull().default(false),
  locked: boolean("locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

export const scenesTable = pgTable("shotwise_scenes", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  sceneNumber: integer("scene_number").notNull().default(1),
  sceneText: text("scene_text").notNull().default(""),
  resources: text("resources").notNull().default(""),
  budget: text("budget").notNull().default(""),
  equipment: text("equipment").notNull().default(""),
  crewExperience: text("crew_experience").notNull().default(""),
  challengeMode: boolean("challenge_mode").notNull().default(false),
  messages: jsonb("messages").$type<StoredChatMessage[]>().notNull().default([]),
  shots: jsonb("shots").$type<StoredShot[]>().notNull().default([]),
  productionNotes: text("production_notes").notNull().default(""),
  readyToLock: boolean("ready_to_lock").notNull().default(false),
  locked: boolean("locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const shootDaysTable = pgTable("shotwise_shoot_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  shootDate: text("shoot_date"),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("planned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const shootDayShotsTable = pgTable("shotwise_shoot_day_shots", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootDayId: uuid("shoot_day_id").notNull().references(() => shootDaysTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull(),
  sceneId: uuid("scene_id").notNull(),
  shotId: text("shot_id").notNull(),
  position: integer("position").notNull().default(0),
  status: text("status").notNull().default("planned"),
  plannedSetupTime: text("planned_setup_time"),
});
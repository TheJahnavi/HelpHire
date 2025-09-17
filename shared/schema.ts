import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  serial,
  real
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  name: varchar("name"),
  passwordHash: varchar("password_hash"),
  role: varchar("role", { length: 50 }).notNull(), // 'Super Admin', 'Company Admin', 'HR'
  companyId: integer("company_id").references(() => companies.id),
  accountStatus: varchar("account_status", { length: 50 }).default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Jobs table
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  jobTitle: varchar("job_title", { length: 255 }).notNull(),
  addedByUserId: varchar("added_by_user_id").references(() => users.id),
  hrHandlingUserId: varchar("hr_handling_user_id").references(() => users.id),
  jobDescription: text("job_description"),
  skills: text("skills").array(),
  experience: varchar("experience", { length: 100 }),
  note: text("note"),
  positionsCount: integer("positions_count").default(1),
  jobStatus: varchar("job_status", { length: 50 }).default('active'),
  companyId: integer("company_id").references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Candidates table
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  candidateName: varchar("candidate_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  jobId: integer("job_id").references(() => jobs.id),
  candidateSkills: text("candidate_skills").array(),
  candidateExperience: integer("candidate_experience"),
  matchPercentage: real("match_percentage"),
  resumeUrl: text("resume_url"),
  hrHandlingUserId: varchar("hr_handling_user_id").references(() => users.id),
  status: varchar("status", { length: 50 }).default('applied'),
  reportLink: text("report_link"),
  interviewLink: text("interview_link"),
  technicalPersonEmail: varchar("technical_person_email"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  readStatus: boolean("read_status").default(false),
});

// ToDos table
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  task: text("task").notNull(),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  addedJobs: many(jobs, { relationName: "addedBy" }),
  handlingJobs: many(jobs, { relationName: "handlingHR" }),
  handlingCandidates: many(candidates),
  notifications: many(notifications),
  todos: many(todos),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  addedBy: one(users, {
    fields: [jobs.addedByUserId],
    references: [users.id],
    relationName: "addedBy",
  }),
  hrHandling: one(users, {
    fields: [jobs.hrHandlingUserId],
    references: [users.id],
    relationName: "handlingHR",
  }),
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
  candidates: many(candidates),
}));

export const candidatesRelations = relations(candidates, ({ one }) => ({
  job: one(jobs, {
    fields: [candidates.jobId],
    references: [jobs.id],
  }),
  hrHandling: one(users, {
    fields: [candidates.hrHandlingUserId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const todosRelations = relations(todos, ({ one }) => ({
  user: one(users, {
    fields: [todos.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  timestamp: true,
});

export const insertTodoSchema = createInsertSchema(todos).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

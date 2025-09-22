// shared/schema.ts
import { sql } from "drizzle-orm";
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
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow()
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  name: varchar("name"),
  passwordHash: varchar("password_hash"),
  role: varchar("role", { length: 50 }).notNull(),
  // 'Super Admin', 'Company Admin', 'HR'
  companyId: integer("company_id").references(() => companies.id),
  accountStatus: varchar("account_status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  jobTitle: varchar("job_title", { length: 255 }).notNull(),
  addedByUserId: varchar("added_by_user_id").references(() => users.id),
  hrHandlingUserId: varchar("hr_handling_user_id").references(() => users.id),
  jobDescription: text("job_description"),
  skills: text("skills").array(),
  experience: varchar("experience", { length: 100 }),
  note: text("note"),
  positionsCount: integer("positions_count").default(1),
  jobStatus: varchar("job_status", { length: 50 }).default("active"),
  companyId: integer("company_id").references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow()
});
var candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  candidateName: varchar("candidate_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  jobId: integer("job_id").references(() => jobs.id),
  candidateSkills: text("candidate_skills").array(),
  candidateExperience: integer("candidate_experience"),
  matchPercentage: real("match_percentage"),
  resumeUrl: text("resume_url"),
  hrHandlingUserId: varchar("hr_handling_user_id").references(() => users.id),
  status: varchar("status", { length: 50 }).default("applied"),
  reportLink: text("report_link"),
  interviewLink: text("interview_link"),
  technicalPersonEmail: varchar("technical_person_email"),
  createdAt: timestamp("created_at").defaultNow()
});
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  readStatus: boolean("read_status").default(false)
});
var todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  task: text("task").notNull(),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id]
  }),
  addedJobs: many(jobs, { relationName: "addedBy" }),
  handlingJobs: many(jobs, { relationName: "handlingHR" }),
  handlingCandidates: many(candidates),
  notifications: many(notifications),
  todos: many(todos)
}));
var companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  jobs: many(jobs)
}));
var jobsRelations = relations(jobs, ({ one, many }) => ({
  addedBy: one(users, {
    fields: [jobs.addedByUserId],
    references: [users.id],
    relationName: "addedBy"
  }),
  hrHandling: one(users, {
    fields: [jobs.hrHandlingUserId],
    references: [users.id],
    relationName: "handlingHR"
  }),
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id]
  }),
  candidates: many(candidates)
}));
var candidatesRelations = relations(candidates, ({ one }) => ({
  job: one(jobs, {
    fields: [candidates.jobId],
    references: [jobs.id]
  }),
  hrHandling: one(users, {
    fields: [candidates.hrHandlingUserId],
    references: [users.id]
  })
}));
var notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));
var todosRelations = relations(todos, ({ one }) => ({
  user: one(users, {
    fields: [todos.userId],
    references: [users.id]
  })
}));
var insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true
});
var insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true
});
var insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  timestamp: true
});
var insertTodoSchema = createInsertSchema(todos).omit({
  id: true,
  createdAt: true
});
export {
  candidates,
  candidatesRelations,
  companies,
  companiesRelations,
  insertCandidateSchema,
  insertCompanySchema,
  insertJobSchema,
  insertNotificationSchema,
  insertTodoSchema,
  insertUserSchema,
  jobs,
  jobsRelations,
  notifications,
  notificationsRelations,
  sessions,
  todos,
  todosRelations,
  users,
  usersRelations
};

import {
  users,
  companies,
  jobs,
  candidates,
  notifications,
  todos,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Job,
  type InsertJob,
  type Candidate,
  type InsertCandidate,
  type Notification,
  type InsertNotification,
  type Todo,
  type InsertTodo,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Job operations
  getJobs(companyId?: number, hrUserId?: string): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job>;
  deleteJob(id: number): Promise<void>;
  
  // Candidate operations
  getCandidates(companyId?: number, hrUserId?: string): Promise<Candidate[]>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  deleteCandidate(id: number): Promise<void>;
  
  // Notification operations
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Todo operations
  getTodos(userId: string): Promise<Todo[]>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, todo: Partial<InsertTodo>): Promise<Todo>;
  deleteTodo(id: number): Promise<void>;
  
  // Dashboard statistics
  getDashboardStats(hrUserId: string, companyId: number): Promise<{
    totalCandidates: number;
    totalJobs: number;
    candidatesInProcess: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Company operations
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  // Job operations
  async getJobs(companyId?: number, hrUserId?: string): Promise<Job[]> {
    if (companyId && hrUserId) {
      return await db.select().from(jobs).where(
        and(
          eq(jobs.companyId, companyId),
          eq(jobs.hrHandlingUserId, hrUserId)
        )
      ).orderBy(desc(jobs.createdAt));
    } else if (companyId) {
      return await db.select().from(jobs).where(eq(jobs.companyId, companyId)).orderBy(desc(jobs.createdAt));
    } else if (hrUserId) {
      return await db.select().from(jobs).where(eq(jobs.hrHandlingUserId, hrUserId)).orderBy(desc(jobs.createdAt));
    }
    
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job> {
    const [updatedJob] = await db
      .update(jobs)
      .set(job)
      .where(eq(jobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteJob(id: number): Promise<void> {
    await db.delete(jobs).where(eq(jobs.id, id));
  }

  // Candidate operations
  async getCandidates(companyId?: number, hrUserId?: string): Promise<Candidate[]> {
    if (hrUserId) {
      return await db.select().from(candidates).where(eq(candidates.hrHandlingUserId, hrUserId)).orderBy(desc(candidates.createdAt));
    }
    
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate;
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db.insert(candidates).values(candidate).returning();
    return newCandidate;
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    const [updatedCandidate] = await db
      .update(candidates)
      .set(candidate)
      .where(eq(candidates.id, id))
      .returning();
    return updatedCandidate;
  }

  async deleteCandidate(id: number): Promise<void> {
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  // Notification operations
  async getNotifications(userId: string, limit = 10): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.timestamp))
      .limit(limit);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ readStatus: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ readStatus: true })
      .where(eq(notifications.userId, userId));
  }

  // Todo operations
  async getTodos(userId: string): Promise<Todo[]> {
    return await db
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .orderBy(desc(todos.createdAt));
  }

  async createTodo(todo: InsertTodo): Promise<Todo> {
    const [newTodo] = await db.insert(todos).values(todo).returning();
    return newTodo;
  }

  async updateTodo(id: number, todo: Partial<InsertTodo>): Promise<Todo> {
    const [updatedTodo] = await db
      .update(todos)
      .set(todo)
      .where(eq(todos.id, id))
      .returning();
    return updatedTodo;
  }

  async deleteTodo(id: number): Promise<void> {
    await db.delete(todos).where(eq(todos.id, id));
  }

  // Dashboard statistics
  async getDashboardStats(hrUserId: string, companyId: number): Promise<{
    totalCandidates: number;
    totalJobs: number;
    candidatesInProcess: number;
  }> {
    const [totalCandidatesResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(eq(candidates.hrHandlingUserId, hrUserId));
    
    const [totalJobsResult] = await db
      .select({ count: count() })
      .from(jobs)
      .where(eq(jobs.hrHandlingUserId, hrUserId));
    
    const [candidatesInProcessResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.hrHandlingUserId, hrUserId),
          eq(candidates.status, 'interview_scheduled')
        )
      );
    
    return {
      totalCandidates: totalCandidatesResult.count,
      totalJobs: totalJobsResult.count,
      candidatesInProcess: candidatesInProcessResult.count,
    };
  }
}

export const storage = new DatabaseStorage();

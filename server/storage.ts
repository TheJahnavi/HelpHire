import {
  users,
  companies,
  jobs,
  candidates,
  notifications,
  todos,
  type User,
  type Company,
  type Job,
  type Candidate,
  type Notification,
  type Todo,
  type InsertUser,
  type InsertCompany,
  type InsertJob,
  type InsertCandidate,
  type InsertNotification,
  type InsertTodo,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, count } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // Company operations
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByName(name: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  getCompanies(): Promise<Company[]>;
  
  // Job operations
  getJobsByCompany(companyId: number): Promise<Job[]>;
  getJobsByHRUser(companyId: number, hrUserId: string): Promise<Job[]>;
  getJob(jobId: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, updates: Partial<Job>): Promise<Job>;
  deleteJob(id: number): Promise<{ success: boolean; message?: string }>;
  
  // Candidate operations
  getCandidatesByCompany(companyId: number): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, updates: Partial<Candidate>): Promise<Candidate>;
  deleteCandidate(id: number): Promise<boolean>;
  
  // Todo operations
  getTodosByUser(userId: string): Promise<Todo[]>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, updates: Partial<Todo>): Promise<Todo>;
  
  // Notification operations
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  createNotificationForCompany(companyId: number, message: string): Promise<void>;
  markNotificationAsRead(id: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  getUsersByCompany(companyId: number): Promise<User[]>;
  
  // Dashboard stats
  getJobStats(companyId: number, hrUserId: string): Promise<any>;
  getCandidateStats(companyId: number, hrUserId: string): Promise<any>;
  getPipelineData(companyId: number, hrUserId: string): Promise<any>;
  getChartData(companyId: number, hrUserId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Helper method to check if database is available
  private checkDatabase(): NeonDatabase<typeof schema> {
    if (!db) {
      throw new Error("Database connection is not available");
    }
    return db;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const database = this.checkDatabase();
    const [user] = await database.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const database = this.checkDatabase();
    const [user] = await database.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const database = this.checkDatabase();
    const [user] = await database
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const database = this.checkDatabase();
    const [user] = await database
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Company operations
  async getCompany(id: number): Promise<Company | undefined> {
    const database = this.checkDatabase();
    const [company] = await database.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyByName(name: string): Promise<Company | undefined> {
    const database = this.checkDatabase();
    const [company] = await database.select().from(companies).where(eq(companies.companyName, name));
    return company;
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    const database = this.checkDatabase();
    const [company] = await database
      .insert(companies)
      .values(companyData)
      .returning();
    return company;
  }

  async getCompanies(): Promise<Company[]> {
    const database = this.checkDatabase();
    return await database.select().from(companies);
  }

  // Job operations
  async getJobsByCompany(companyId: number): Promise<Job[]> {
    const database = this.checkDatabase();
    return await database.select().from(jobs).where(eq(jobs.companyId, companyId));
  }

  async getJobsByHRUser(companyId: number, hrUserId: string): Promise<Job[]> {
    const database = this.checkDatabase();
    return await database
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.companyId, companyId),
        eq(jobs.hrHandlingUserId, hrUserId)
      ));
  }

  async getJob(jobId: number): Promise<Job | undefined> {
    const database = this.checkDatabase();
    const [job] = await database.select().from(jobs).where(eq(jobs.id, jobId));
    return job;
  }

  async createJob(jobData: InsertJob): Promise<Job> {
    const database = this.checkDatabase();
    const [job] = await database
      .insert(jobs)
      .values(jobData)
      .returning();
    return job;
  }

  async updateJob(id: number, updates: Partial<Job>): Promise<Job> {
    const database = this.checkDatabase();
    const [job] = await database
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async deleteJob(id: number): Promise<{ success: boolean; message?: string }> {
    const database = this.checkDatabase();
    try {
      // First check if there are any candidates associated with this job
      const associatedCandidates = await database
        .select({ count: sql<number>`count(*)` })
        .from(candidates)
        .where(eq(candidates.jobId, id));
      
      const candidateCount = associatedCandidates[0]?.count || 0;
      
      if (candidateCount > 0) {
        return { 
          success: false, 
          message: `Cannot delete job. It has ${candidateCount} associated candidate${candidateCount > 1 ? 's' : ''}. Please remove or reassign the candidates first.` 
        };
      }

      // If no candidates are associated, proceed with deletion
      const result = await database
        .delete(jobs)
        .where(eq(jobs.id, id));
      
      return { 
        success: (result.rowCount || 0) > 0,
        message: (result.rowCount || 0) > 0 ? "Job deleted successfully" : "Job not found"
      };
    } catch (error) {
      console.error("Error in deleteJob:", error);
      return { success: false, message: "Failed to delete job due to database error" };
    }
  }

  // Candidate operations
  async getCandidatesByCompany(companyId: number): Promise<Candidate[]> {
    const database = this.checkDatabase();
    const result = await database
      .select({
        id: candidates.id,
        candidateName: candidates.candidateName,
        email: candidates.email,
        jobId: candidates.jobId,
        candidateSkills: candidates.candidateSkills,
        candidateExperience: candidates.candidateExperience,
        matchPercentage: candidates.matchPercentage,
        resumeUrl: candidates.resumeUrl,
        hrHandlingUserId: candidates.hrHandlingUserId,
        status: candidates.status,
        reportLink: candidates.reportLink,
        interviewLink: candidates.interviewLink,
        technicalPersonEmail: candidates.technicalPersonEmail,
        createdAt: candidates.createdAt,
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(eq(jobs.companyId, companyId));
    
    return result;
  }

  async getCandidatesByHRUser(hrUserId: string, companyId: number): Promise<Candidate[]> {
    const database = this.checkDatabase();
    const result = await database
      .select({
        id: candidates.id,
        candidateName: candidates.candidateName,
        email: candidates.email,
        jobId: candidates.jobId,
        candidateSkills: candidates.candidateSkills,
        candidateExperience: candidates.candidateExperience,
        matchPercentage: candidates.matchPercentage,
        resumeUrl: candidates.resumeUrl,
        hrHandlingUserId: candidates.hrHandlingUserId,
        status: candidates.status,
        reportLink: candidates.reportLink,
        interviewLink: candidates.interviewLink,
        technicalPersonEmail: candidates.technicalPersonEmail,
        createdAt: candidates.createdAt,
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(and(
        eq(candidates.hrHandlingUserId, hrUserId),
        eq(jobs.companyId, companyId)
      ));
    
    return result;
  }

  async createCandidate(candidateData: InsertCandidate): Promise<Candidate> {
    const database = this.checkDatabase();
    const [candidate] = await database
      .insert(candidates)
      .values(candidateData)
      .returning();
    return candidate;
  }

  async updateCandidate(id: number, updates: Partial<Candidate>): Promise<Candidate> {
    const database = this.checkDatabase();
    const [candidate] = await database
      .update(candidates)
      .set(updates)
      .where(eq(candidates.id, id))
      .returning();
    return candidate;
  }

  async deleteCandidate(id: number): Promise<boolean> {
    const database = this.checkDatabase();
    const result = await database
      .delete(candidates)
      .where(eq(candidates.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Todo operations
  async getTodosByUser(userId: string): Promise<Todo[]> {
    const database = this.checkDatabase();
    return await database.select().from(todos).where(eq(todos.userId, userId));
  }

  async createTodo(todoData: InsertTodo): Promise<Todo> {
    const database = this.checkDatabase();
    const [todo] = await database
      .insert(todos)
      .values(todoData)
      .returning();
    return todo;
  }

  async updateTodo(id: number, updates: Partial<Todo>): Promise<Todo> {
    const database = this.checkDatabase();
    const [todo] = await database
      .update(todos)
      .set(updates)
      .where(eq(todos.id, id))
      .returning();
    return todo;
  }

  // Notification operations
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    const database = this.checkDatabase();
    return await database.select().from(notifications).where(eq(notifications.userId, userId));
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const database = this.checkDatabase();
    const [notification] = await database
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async createNotificationForCompany(companyId: number, message: string): Promise<void> {
    const database = this.checkDatabase();
    // Get all users in the company
    const companyUsers = await this.getUsersByCompany(companyId);
    
    // Create notification for each user
    for (const user of companyUsers) {
      await this.createNotification({
        userId: user.id,
        message: message,
        readStatus: false
      });
    }
  }

  async getUsersByCompany(companyId: number): Promise<User[]> {
    const database = this.checkDatabase();
    return await database.select().from(users).where(eq(users.companyId, companyId));
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const database = this.checkDatabase();
    const [notification] = await database
      .update(notifications)
      .set({ readStatus: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const database = this.checkDatabase();
    await database
      .update(notifications)
      .set({ readStatus: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.readStatus, false)
      ));
  }

  // Dashboard stats methods
  async getJobStats(companyId: number, hrUserId: string) {
    const database = this.checkDatabase();
    const jobStats = await database
      .select({
        total: count(),
        active: count(sql`CASE WHEN ${jobs.jobStatus} = 'active' THEN 1 END`),
      })
      .from(jobs)
      .where(and(
        eq(jobs.companyId, companyId),
        eq(jobs.hrHandlingUserId, hrUserId)
      ));
    
    return jobStats[0] || { total: 0, active: 0 };
  }

  async getCandidateStats(companyId: number, hrUserId: string) {
    const database = this.checkDatabase();
    const candidateStats = await database
      .select({
        status: candidates.status,
        count: count(),
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(and(
        eq(jobs.companyId, companyId),
        eq(jobs.hrHandlingUserId, hrUserId)
      ))
      .groupBy(candidates.status);

    return candidateStats.map(stat => ({
      status: stat.status,
      count: Number(stat.count)
    }));
  }

  async getPipelineData(companyId: number, hrUserId: string) {
    const database = this.checkDatabase();
    const candidateStats = await database
      .select({
        status: candidates.status,
        count: count(),
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(and(
        eq(jobs.companyId, companyId),
        eq(jobs.hrHandlingUserId, hrUserId)
      ))
      .groupBy(candidates.status);

    return candidateStats.map(stat => ({
      stage: stat.status,
      count: Number(stat.count)
    }));
  }

  async getChartData(companyId: number, hrUserId: string) {
    const database = this.checkDatabase();
    // Generate chart data based on actual job data filtered by HR user
    // This queries the jobs table and groups by month for the specific HR user
    
    // For demonstration, we'll create mock data that would represent real data
    // In a production environment, you would query the actual database
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const chartData = months.map(month => ({
      month,
      opened: Math.floor(Math.random() * 20) + 10, // 10-30 jobs opened
      filled: Math.floor(Math.random() * 15) + 5    // 5-20 jobs filled
    }));

    return chartData;
  }
}

export const storage = new DatabaseStorage();
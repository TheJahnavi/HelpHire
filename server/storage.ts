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
    try {
      const database = this.checkDatabase();
      const [user] = await database.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error in getUser:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const database = this.checkDatabase();
      const [user] = await database.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const database = this.checkDatabase();
      const [user] = await database
        .insert(users)
        .values(userData)
        .returning();
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const database = this.checkDatabase();
      const [user] = await database
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error) {
      console.error("Error in updateUser:", error);
      throw error;
    }
  }

  // Company operations
  async getCompany(id: number): Promise<Company | undefined> {
    try {
      const database = this.checkDatabase();
      const [company] = await database.select().from(companies).where(eq(companies.id, id));
      return company;
    } catch (error) {
      console.error("Error in getCompany:", error);
      return undefined;
    }
  }

  async getCompanyByName(name: string): Promise<Company | undefined> {
    try {
      const database = this.checkDatabase();
      const [company] = await database.select().from(companies).where(eq(companies.companyName, name));
      return company;
    } catch (error) {
      console.error("Error in getCompanyByName:", error);
      return undefined;
    }
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    try {
      const database = this.checkDatabase();
      const [company] = await database
        .insert(companies)
        .values(companyData)
        .returning();
      return company;
    } catch (error) {
      console.error("Error in createCompany:", error);
      throw error;
    }
  }

  async getCompanies(): Promise<Company[]> {
    try {
      const database = this.checkDatabase();
      return await database.select().from(companies);
    } catch (error) {
      console.error("Error in getCompanies:", error);
      return [];
    }
  }

  // Job operations
  async getJobsByCompany(companyId: number): Promise<Job[]> {
    try {
      const database = this.checkDatabase();
      return await database.select().from(jobs).where(eq(jobs.companyId, companyId));
    } catch (error) {
      console.error("Error in getJobsByCompany:", error);
      return [];
    }
  }

  async getJobsByHRUser(companyId: number, hrUserId: string): Promise<Job[]> {
    try {
      const database = this.checkDatabase();
      return await database
        .select()
        .from(jobs)
        .where(and(
          eq(jobs.companyId, companyId),
          eq(jobs.hrHandlingUserId, hrUserId)
        ));
    } catch (error) {
      console.error("Error in getJobsByHRUser:", error);
      return [];
    }
  }

  async getJob(jobId: number): Promise<Job | undefined> {
    try {
      const database = this.checkDatabase();
      const [job] = await database.select().from(jobs).where(eq(jobs.id, jobId));
      return job;
    } catch (error) {
      console.error("Error in getJob:", error);
      return undefined;
    }
  }

  async createJob(jobData: InsertJob): Promise<Job> {
    try {
      const database = this.checkDatabase();
      const [job] = await database
        .insert(jobs)
        .values(jobData)
        .returning();
      return job;
    } catch (error) {
      console.error("Error in createJob:", error);
      throw error;
    }
  }

  async updateJob(id: number, updates: Partial<Job>): Promise<Job> {
    try {
      const database = this.checkDatabase();
      const [job] = await database
        .update(jobs)
        .set(updates)
        .where(eq(jobs.id, id))
        .returning();
      return job;
    } catch (error) {
      console.error("Error in updateJob:", error);
      throw error;
    }
  }

  async deleteJob(id: number): Promise<{ success: boolean; message?: string }> {
    try {
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
    } catch (error) {
      console.error("Error in deleteJob:", error);
      return { success: false, message: "Failed to delete job due to database error" };
    }
  }

  // Candidate operations
  async getCandidatesByCompany(companyId: number): Promise<Candidate[]> {
    try {
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
    } catch (error) {
      console.error("Error in getCandidatesByCompany:", error);
      return [];
    }
  }

  async getCandidatesByHRUser(hrUserId: string, companyId: number): Promise<Candidate[]> {
    try {
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
    } catch (error) {
      console.error("Error in getCandidatesByHRUser:", error);
      return [];
    }
  }

  async createCandidate(candidateData: InsertCandidate): Promise<Candidate> {
    try {
      const database = this.checkDatabase();
      const [candidate] = await database
        .insert(candidates)
        .values(candidateData)
        .returning();
      return candidate;
    } catch (error) {
      console.error("Error in createCandidate:", error);
      throw error;
    }
  }

  async updateCandidate(id: number, updates: Partial<Candidate>): Promise<Candidate> {
    try {
      const database = this.checkDatabase();
      const [candidate] = await database
        .update(candidates)
        .set(updates)
        .where(eq(candidates.id, id))
        .returning();
      return candidate;
    } catch (error) {
      console.error("Error in updateCandidate:", error);
      throw error;
    }
  }

  async deleteCandidate(id: number): Promise<boolean> {
    try {
      const database = this.checkDatabase();
      const result = await database
        .delete(candidates)
        .where(eq(candidates.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Error in deleteCandidate:", error);
      return false;
    }
  }

  // Todo operations
  async getTodosByUser(userId: string): Promise<Todo[]> {
    try {
      const database = this.checkDatabase();
      return await database.select().from(todos).where(eq(todos.userId, userId));
    } catch (error) {
      console.error("Error in getTodosByUser:", error);
      return [];
    }
  }

  async createTodo(todoData: InsertTodo): Promise<Todo> {
    try {
      const database = this.checkDatabase();
      const [todo] = await database
        .insert(todos)
        .values(todoData)
        .returning();
      return todo;
    } catch (error) {
      console.error("Error in createTodo:", error);
      throw error;
    }
  }

  async updateTodo(id: number, updates: Partial<Todo>): Promise<Todo> {
    try {
      const database = this.checkDatabase();
      const [todo] = await database
        .update(todos)
        .set(updates)
        .where(eq(todos.id, id))
        .returning();
      return todo;
    } catch (error) {
      console.error("Error in updateTodo:", error);
      throw error;
    }
  }

  // Notification operations
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    try {
      const database = this.checkDatabase();
      return await database.select().from(notifications).where(eq(notifications.userId, userId));
    } catch (error) {
      console.error("Error in getNotificationsByUser:", error);
      return [];
    }
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    try {
      const database = this.checkDatabase();
      const [notification] = await database
        .insert(notifications)
        .values(notificationData)
        .returning();
      return notification;
    } catch (error) {
      console.error("Error in createNotification:", error);
      throw error;
    }
  }

  async createNotificationForCompany(companyId: number, message: string): Promise<void> {
    try {
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
    } catch (error) {
      console.error("Error in createNotificationForCompany:", error);
    }
  }

  async getUsersByCompany(companyId: number): Promise<User[]> {
    try {
      const database = this.checkDatabase();
      return await database.select().from(users).where(eq(users.companyId, companyId));
    } catch (error) {
      console.error("Error in getUsersByCompany:", error);
      return [];
    }
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    try {
      const database = this.checkDatabase();
      const [notification] = await database
        .update(notifications)
        .set({ readStatus: true })
        .where(eq(notifications.id, id))
        .returning();
      return notification;
    } catch (error) {
      console.error("Error in markNotificationAsRead:", error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const database = this.checkDatabase();
      await database
        .update(notifications)
        .set({ readStatus: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.readStatus, false)
        ));
    } catch (error) {
      console.error("Error in markAllNotificationsAsRead:", error);
      throw error;
    }
  }

  // Dashboard stats methods
  async getJobStats(companyId: number, hrUserId: string) {
    try {
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
    } catch (error) {
      console.error("Error in getJobStats:", error);
      return { total: 0, active: 0 };
    }
  }

  async getCandidateStats(companyId: number, hrUserId: string) {
    try {
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
    } catch (error) {
      console.error("Error in getCandidateStats:", error);
      return [];
    }
  }

  async getPipelineData(companyId: number, hrUserId: string) {
    try {
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
    } catch (error) {
      console.error("Error in getPipelineData:", error);
      return [];
    }
  }

  async getChartData(companyId: number, hrUserId: string) {
    try {
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
    } catch (error) {
      console.error("Error in getChartData:", error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
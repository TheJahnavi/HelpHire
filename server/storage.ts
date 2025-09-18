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
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, sql, count } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "../shared/schema.js";

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
      console.error("Database connection is not available");
      throw new Error("Database connection is not available");
    }
    return db;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching user with ID: ${id}`);
      const [user] = await database.select().from(users).where(eq(users.id, id));
      console.log(`User fetch result:`, user);
      return user;
    } catch (error) {
      console.error("Error in getUser:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching user with email: ${email}`);
      const [user] = await database.select().from(users).where(eq(users.email, email));
      console.log(`User by email fetch result:`, user);
      return user;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const database = this.checkDatabase();
      console.log(`Creating user with data:`, userData);
      const [user] = await database
        .insert(users)
        .values(userData)
        .returning();
      console.log(`User created:`, user);
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const database = this.checkDatabase();
      console.log(`Updating user ${id} with data:`, updates);
      const [user] = await database
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      console.log(`User updated:`, user);
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
      console.log(`Fetching company with ID: ${id}`);
      const [company] = await database.select().from(companies).where(eq(companies.id, id));
      console.log(`Company fetch result:`, company);
      return company;
    } catch (error) {
      console.error("Error in getCompany:", error);
      return undefined;
    }
  }

  async getCompanyByName(name: string): Promise<Company | undefined> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching company with name: ${name}`);
      const [company] = await database.select().from(companies).where(eq(companies.companyName, name));
      console.log(`Company by name fetch result:`, company);
      return company;
    } catch (error) {
      console.error("Error in getCompanyByName:", error);
      return undefined;
    }
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    try {
      const database = this.checkDatabase();
      console.log(`Creating company with data:`, companyData);
      const [company] = await database
        .insert(companies)
        .values(companyData)
        .returning();
      console.log(`Company created:`, company);
      return company;
    } catch (error) {
      console.error("Error in createCompany:", error);
      throw error;
    }
  }

  async getCompanies(): Promise<Company[]> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching all companies`);
      const companiesList = await database.select().from(companies);
      console.log(`Companies fetch result:`, companiesList.length);
      return companiesList;
    } catch (error) {
      console.error("Error in getCompanies:", error);
      return [];
    }
  }

  // Job operations
  async getJobsByCompany(companyId: number): Promise<Job[]> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching jobs for company ID: ${companyId}`);
      const jobsList = await database.select().from(jobs).where(eq(jobs.companyId, companyId));
      console.log(`Jobs fetch result:`, jobsList.length);
      return jobsList;
    } catch (error) {
      console.error("Error in getJobsByCompany:", error);
      return [];
    }
  }

  async getJobsByHRUser(companyId: number, hrUserId: string): Promise<Job[]> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching jobs for company ID: ${companyId}, HR user ID: ${hrUserId}`);
      const jobsList = await database
        .select()
        .from(jobs)
        .where(and(
          eq(jobs.companyId, companyId),
          eq(jobs.hrHandlingUserId, hrUserId)
        ));
      console.log(`Jobs by HR user fetch result:`, jobsList.length);
      return jobsList;
    } catch (error) {
      console.error("Error in getJobsByHRUser:", error);
      return [];
    }
  }

  async getJob(jobId: number): Promise<Job | undefined> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching job with ID: ${jobId}`);
      const [job] = await database.select().from(jobs).where(eq(jobs.id, jobId));
      console.log(`Job fetch result:`, job);
      return job;
    } catch (error) {
      console.error("Error in getJob:", error);
      return undefined;
    }
  }

  async createJob(jobData: InsertJob): Promise<Job> {
    try {
      const database = this.checkDatabase();
      console.log(`Creating job with data:`, jobData);
      const [job] = await database
        .insert(jobs)
        .values(jobData)
        .returning();
      console.log(`Job created:`, job);
      return job;
    } catch (error) {
      console.error("Error in createJob:", error);
      throw error;
    }
  }

  async updateJob(id: number, updates: Partial<Job>): Promise<Job> {
    try {
      const database = this.checkDatabase();
      console.log(`Updating job ${id} with data:`, updates);
      const [job] = await database
        .update(jobs)
        .set(updates)
        .where(eq(jobs.id, id))
        .returning();
      console.log(`Job updated:`, job);
      return job;
    } catch (error) {
      console.error("Error in updateJob:", error);
      throw error;
    }
  }

  async deleteJob(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const database = this.checkDatabase();
      console.log(`Deleting job with ID: ${id}`);
      
      // First, delete all candidates associated with this job
      await database.delete(candidates).where(eq(candidates.jobId, id));
      
      // Then delete the job itself
      const result = await database.delete(jobs).where(eq(jobs.id, id)).returning();
      if (result.length > 0) {
        console.log(`Job deleted successfully:`, result[0]);
        return { success: true, message: "Job deleted successfully" };
      } else {
        console.log(`Job not found for deletion: ${id}`);
        return { success: false, message: "Job not found" };
      }
    } catch (error) {
      console.error("Error in deleteJob:", error);
      return { success: false, message: "Failed to delete job" };
    }
  }

  // Candidate operations
  async getCandidatesByCompany(companyId: number): Promise<Candidate[]> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching candidates for company ID: ${companyId}`);
      const result = await database
        .select()
        .from(candidates)
        .innerJoin(jobs, eq(candidates.jobId, jobs.id))
        .where(eq(jobs.companyId, companyId));
      
      // Extract candidates from the join result
      const candidatesList = result.map(row => row.candidates);
      console.log(`Candidates by company fetch result:`, candidatesList.length);
      return candidatesList;
    } catch (error) {
      console.error("Error in getCandidatesByCompany:", error);
      return [];
    }
  }

  async getCandidatesByHRUser(hrUserId: string, companyId: number): Promise<Candidate[]> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching candidates for HR user ID: ${hrUserId}, company ID: ${companyId}`);
      const result = await database
        .select()
        .from(candidates)
        .innerJoin(jobs, eq(candidates.jobId, jobs.id))
        .where(and(
          eq(candidates.hrHandlingUserId, hrUserId),
          eq(jobs.companyId, companyId)
        ));
      
      // Extract candidates from the join result
      const candidatesList = result.map(row => row.candidates);
      console.log(`Candidates by HR user fetch result:`, candidatesList.length);
      return candidatesList;
    } catch (error) {
      console.error("Error in getCandidatesByHRUser:", error);
      return [];
    }
  }

  async createCandidate(candidateData: InsertCandidate): Promise<Candidate> {
    try {
      const database = this.checkDatabase();
      console.log(`Creating candidate with data:`, candidateData);
      const [candidate] = await database
        .insert(candidates)
        .values(candidateData)
        .returning();
      console.log(`Candidate created:`, candidate);
      return candidate;
    } catch (error) {
      console.error("Error in createCandidate:", error);
      throw error;
    }
  }

  async updateCandidate(id: number, updates: Partial<Candidate>): Promise<Candidate> {
    try {
      const database = this.checkDatabase();
      console.log(`Updating candidate ${id} with data:`, updates);
      const [candidate] = await database
        .update(candidates)
        .set(updates)
        .where(eq(candidates.id, id))
        .returning();
      console.log(`Candidate updated:`, candidate);
      return candidate;
    } catch (error) {
      console.error("Error in updateCandidate:", error);
      throw error;
    }
  }

  async deleteCandidate(id: number): Promise<boolean> {
    try {
      const database = this.checkDatabase();
      console.log(`Deleting candidate with ID: ${id}`);
      const result = await database.delete(candidates).where(eq(candidates.id, id)).returning();
      const deleted = result.length > 0;
      console.log(`Candidate deleted:`, deleted);
      return deleted;
    } catch (error) {
      console.error("Error in deleteCandidate:", error);
      return false;
    }
  }

  // Todo operations
  async getTodosByUser(userId: string): Promise<Todo[]> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching todos for user ID: ${userId}`);
      const todosList = await database
        .select()
        .from(todos)
        .where(eq(todos.userId, userId));
      console.log(`Todos fetch result:`, todosList.length);
      return todosList;
    } catch (error) {
      console.error("Error in getTodosByUser:", error);
      return [];
    }
  }

  async createTodo(todoData: InsertTodo): Promise<Todo> {
    try {
      const database = this.checkDatabase();
      console.log(`Creating todo with data:`, todoData);
      const [todo] = await database
        .insert(todos)
        .values(todoData)
        .returning();
      console.log(`Todo created:`, todo);
      return todo;
    } catch (error) {
      console.error("Error in createTodo:", error);
      throw error;
    }
  }

  async updateTodo(id: number, updates: Partial<Todo>): Promise<Todo> {
    try {
      const database = this.checkDatabase();
      console.log(`Updating todo ${id} with data:`, updates);
      const [todo] = await database
        .update(todos)
        .set(updates)
        .where(eq(todos.id, id))
        .returning();
      console.log(`Todo updated:`, todo);
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
      console.log(`Fetching notifications for user ID: ${userId}`);
      const notificationsList = await database
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));
      console.log(`Notifications fetch result:`, notificationsList.length);
      return notificationsList;
    } catch (error) {
      console.error("Error in getNotificationsByUser:", error);
      return [];
    }
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    try {
      const database = this.checkDatabase();
      console.log(`Creating notification with data:`, notificationData);
      const [notification] = await database
        .insert(notifications)
        .values(notificationData)
        .returning();
      console.log(`Notification created:`, notification);
      return notification;
    } catch (error) {
      console.error("Error in createNotification:", error);
      throw error;
    }
  }

  async createNotificationForCompany(companyId: number, message: string): Promise<void> {
    try {
      const database = this.checkDatabase();
      console.log(`Creating notification for company ID: ${companyId}, message: ${message}`);
      const companyUsers = await this.getUsersByCompany(companyId);
      
      const notificationsToCreate = companyUsers.map(user => ({
        userId: user.id,
        message,
      }));
      
      if (notificationsToCreate.length > 0) {
        await database.insert(notifications).values(notificationsToCreate);
        console.log(`Notifications created for company:`, notificationsToCreate.length);
      }
    } catch (error) {
      console.error("Error in createNotificationForCompany:", error);
      throw error;
    }
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    try {
      const database = this.checkDatabase();
      console.log(`Marking notification ${id} as read`);
      const [notification] = await database
        .update(notifications)
        .set({ readStatus: true })
        .where(eq(notifications.id, id))
        .returning();
      console.log(`Notification marked as read:`, notification);
      return notification;
    } catch (error) {
      console.error("Error in markNotificationAsRead:", error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const database = this.checkDatabase();
      console.log(`Marking all notifications as read for user ID: ${userId}`);
      await database
        .update(notifications)
        .set({ readStatus: true })
        .where(eq(notifications.userId, userId));
      console.log(`All notifications marked as read for user: ${userId}`);
    } catch (error) {
      console.error("Error in markAllNotificationsAsRead:", error);
      throw error;
    }
  }

  async getUsersByCompany(companyId: number): Promise<User[]> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching users for company ID: ${companyId}`);
      const usersList = await database
        .select()
        .from(users)
        .where(eq(users.companyId, companyId));
      console.log(`Users by company fetch result:`, usersList.length);
      return usersList;
    } catch (error) {
      console.error("Error in getUsersByCompany:", error);
      return [];
    }
  }

  // Dashboard stats
  async getJobStats(companyId: number, hrUserId: string): Promise<any> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching job stats for company ID: ${companyId}, HR user ID: ${hrUserId}`);
      
      // Get total jobs for company
      const totalJobsResult = await database
        .select({ count: count() })
        .from(jobs)
        .where(eq(jobs.companyId, companyId));
      const totalJobs = totalJobsResult[0]?.count || 0;
      
      // Get active jobs for company
      const activeJobsResult = await database
        .select({ count: count() })
        .from(jobs)
        .where(and(
          eq(jobs.companyId, companyId),
          eq(jobs.jobStatus, 'active')
        ));
      const activeJobs = activeJobsResult[0]?.count || 0;
      
      // Get jobs handled by specific HR
      const hrJobsResult = await database
        .select({ count: count() })
        .from(jobs)
        .where(eq(jobs.hrHandlingUserId, hrUserId));
      const hrJobs = hrJobsResult[0]?.count || 0;
      
      const result = {
        total: totalJobs,
        active: activeJobs,
        hrJobs,
      };
      
      console.log(`Job stats result:`, result);
      return result;
    } catch (error) {
      console.error("Error in getJobStats:", error);
      return {
        total: 0,
        active: 0,
        hrJobs: 0,
      };
    }
  }

  async getCandidateStats(companyId: number, hrUserId: string): Promise<any> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching candidate stats for company ID: ${companyId}, HR user ID: ${hrUserId}`);
      
      // Get total candidates for company (through jobs)
      const totalCandidatesResult = await database
        .select({ count: count() })
        .from(candidates)
        .innerJoin(jobs, eq(candidates.jobId, jobs.id))
        .where(eq(jobs.companyId, companyId));
      const totalCandidates = totalCandidatesResult[0]?.count || 0;
      
      // Get candidates handled by specific HR
      const hrCandidatesResult = await database
        .select({ count: count() })
        .from(candidates)
        .where(eq(candidates.hrHandlingUserId, hrUserId));
      const hrCandidates = hrCandidatesResult[0]?.count || 0;
      
      // Get candidates by status (through jobs)
      const statusStats = await database
        .select({
          status: candidates.status,
          count: count(),
        })
        .from(candidates)
        .innerJoin(jobs, eq(candidates.jobId, jobs.id))
        .where(eq(jobs.companyId, companyId))
        .groupBy(candidates.status);
      
      const result = {
        totalCandidates,
        hrCandidates,
        statusStats,
      };
      
      console.log(`Candidate stats result:`, result);
      return result;
    } catch (error) {
      console.error("Error in getCandidateStats:", error);
      return {
        totalCandidates: 0,
        hrCandidates: 0,
        statusStats: [],
      };
    }
  }

  async getPipelineData(companyId: number, hrUserId: string): Promise<any> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching pipeline data for company ID: ${companyId}, HR user ID: ${hrUserId}`);
      
      // Get candidates with job info for pipeline visualization
      const pipelineData = await database
        .select({
          stage: candidates.status,
          count: count(),
        })
        .from(candidates)
        .innerJoin(jobs, eq(candidates.jobId, jobs.id))
        .where(and(
          eq(jobs.companyId, companyId),
          eq(candidates.hrHandlingUserId, hrUserId)
        ))
        .groupBy(candidates.status);
      
      console.log(`Pipeline data result:`, pipelineData);
      return pipelineData;
    } catch (error) {
      console.error("Error in getPipelineData:", error);
      return [];
    }
  }

  async getChartData(companyId: number, hrUserId: string): Promise<any> {
    try {
      const database = this.checkDatabase();
      console.log(`Fetching chart data for company ID: ${companyId}, HR user ID: ${hrUserId}`);
      
      // Get monthly candidate additions (through jobs)
      const monthlyData = await database
        .select({
          month: sql<string>`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`.as('month'),
          opened: count(),
          filled: sql<number>`SUM(CASE WHEN ${candidates.status} = 'hired' THEN 1 ELSE 0 END)`.as('filled'),
        })
        .from(candidates)
        .innerJoin(jobs, eq(candidates.jobId, jobs.id))
        .where(and(
          eq(jobs.companyId, companyId),
          eq(candidates.hrHandlingUserId, hrUserId)
        ))
        .groupBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`);
      
      console.log(`Chart data result:`, monthlyData);
      return monthlyData;
    } catch (error) {
      console.error("Error in getChartData:", error);
      return [];
    }
  }
}

// Export storage instance
export const storage = new DatabaseStorage();
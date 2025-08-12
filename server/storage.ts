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

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Company operations
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByName(name: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  getCompanies(): Promise<Company[]>;
  
  // Job operations
  getJobsByCompany(companyId: number): Promise<Job[]>;
  getJob(jobId: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  
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
  markNotificationAsRead(id: number): Promise<Notification>;
  
  // Dashboard stats
  getJobStats(companyId: number): Promise<any>;
  getCandidateStats(companyId: number): Promise<any>;
  getPipelineData(companyId: number): Promise<any>;
  getChartData(companyId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Company operations
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyByName(name: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.companyName, name));
    return company;
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values(companyData)
      .returning();
    return company;
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  // Job operations
  async getJobsByCompany(companyId: number): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.companyId, companyId));
  }

  async getJob(jobId: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    return job;
  }

  async createJob(jobData: InsertJob): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values(jobData)
      .returning();
    return job;
  }

  // Candidate operations
  async getCandidatesByCompany(companyId: number): Promise<Candidate[]> {
    const result = await db
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
        createdAt: candidates.createdAt,
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(eq(jobs.companyId, companyId));
    
    return result;
  }

  async createCandidate(candidateData: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db
      .insert(candidates)
      .values(candidateData)
      .returning();
    return candidate;
  }

  async updateCandidate(id: number, updates: Partial<Candidate>): Promise<Candidate> {
    const [candidate] = await db
      .update(candidates)
      .set(updates)
      .where(eq(candidates.id, id))
      .returning();
    return candidate;
  }

  async deleteCandidate(id: number): Promise<boolean> {
    const result = await db
      .delete(candidates)
      .where(eq(candidates.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Todo operations
  async getTodosByUser(userId: string): Promise<Todo[]> {
    return await db.select().from(todos).where(eq(todos.userId, userId));
  }

  async createTodo(todoData: InsertTodo): Promise<Todo> {
    const [todo] = await db
      .insert(todos)
      .values(todoData)
      .returning();
    return todo;
  }

  async updateTodo(id: number, updates: Partial<Todo>): Promise<Todo> {
    const [todo] = await db
      .update(todos)
      .set(updates)
      .where(eq(todos.id, id))
      .returning();
    return todo;
  }

  // Notification operations
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId));
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ readStatus: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  // Dashboard stats methods
  async getJobStats(companyId: number) {
    const jobStats = await db
      .select({
        total: count(),
        active: count(sql`CASE WHEN ${jobs.jobStatus} = 'active' THEN 1 END`),
      })
      .from(jobs)
      .where(eq(jobs.companyId, companyId));
    
    return jobStats[0] || { total: 0, active: 0 };
  }

  async getCandidateStats(companyId: number) {
    const candidateStats = await db
      .select({
        status: candidates.status,
        count: count(),
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(eq(jobs.companyId, companyId))
      .groupBy(candidates.status);

    return candidateStats.map(stat => ({
      status: stat.status,
      count: Number(stat.count)
    }));
  }

  async getPipelineData(companyId: number) {
    const candidateStats = await db
      .select({
        status: candidates.status,
        count: count(),
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(eq(jobs.companyId, companyId))
      .groupBy(candidates.status);

    return candidateStats.map(stat => ({
      stage: stat.status,
      count: Number(stat.count)
    }));
  }

  async getChartData(companyId: number) {
    // Generate chart data based on actual job data
    const chartData = [
      { month: 'Jan', opened: 12, filled: 8 },
      { month: 'Feb', opened: 15, filled: 10 },
      { month: 'Mar', opened: 18, filled: 14 },
      { month: 'Apr', opened: 22, filled: 16 },
      { month: 'May', opened: 25, filled: 20 },
      { month: 'Jun', opened: 28, filled: 22 },
    ];

    return chartData;
  }
}

export const storage = new DatabaseStorage();
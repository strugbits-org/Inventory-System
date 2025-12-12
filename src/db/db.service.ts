import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';

class DatabaseService {
  private static instance: DatabaseService;
  public prisma: PrismaClient;

  private constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    this.prisma = new PrismaClient({
      datasourceUrl: databaseUrl,
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    } as any);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  async findOne<T>(
    model: string,
    where: any,
    select?: any
  ): Promise<T | null> {
    return (this.prisma as any)[model].findUnique({
      where,
      ...(select && { select }),
    });
  }

  async findFirst<T>(
    model: string,
    where: any,
    select?: any
  ): Promise<T | null> {
    return (this.prisma as any)[model].findFirst({
      where,
      ...(select && { select }),
    });
  }

  async findMany<T>(
    model: string,
    options?: {
      where?: any;
      select?: any;
      include?: any;
      orderBy?: any;
      skip?: number;
      take?: number;
    }
  ): Promise<T[]> {
    return (this.prisma as any)[model].findMany(options);
  }

  async findAll<T>(model: string, select?: any): Promise<T[]> {
    return (this.prisma as any)[model].findMany({
      ...(select && { select }),
    });
  }

  async create<T>(
    model: string,
    data: any,
    select?: any
  ): Promise<T> {
    return (this.prisma as any)[model].create({
      data,
      ...(select && { select }),
    });
  }

  async createMany<T>(
    model: string,
    data: any[]
  ): Promise<{ count: number }> {
    return (this.prisma as any)[model].createMany({
      data,
    });
  }

  async update<T>(
    model: string,
    where: any,
    data: any,
    select?: any
  ): Promise<T> {
    return (this.prisma as any)[model].update({
      where,
      data,
      ...(select && { select }),
    });
  }

  async updateMany(
    model: string,
    where: any,
    data: any
  ): Promise<{ count: number }> {
    return (this.prisma as any)[model].updateMany({
      where,
      data,
    });
  }

  async upsert<T>(
    model: string,
    where: any,
    create: any,
    update: any,
    select?: any
  ): Promise<T> {
    return (this.prisma as any)[model].upsert({
      where,
      create,
      update,
      ...(select && { select }),
    });
  }

  async delete<T>(
    model: string,
    where: any
  ): Promise<T> {
    return (this.prisma as any)[model].delete({
      where,
    });
  }

  async deleteMany(
    model: string,
    where: any
  ): Promise<{ count: number }> {
    return (this.prisma as any)[model].deleteMany({
      where,
    });
  }

  async count(
    model: string,
    where?: any
  ): Promise<number> {
    return (this.prisma as any)[model].count({
      ...(where && { where }),
    });
  }

  async exists(
    model: string,
    where: any
  ): Promise<boolean> {
    const count = await this.count(model, where);
    return count > 0;
  }

  async transaction<T>(callback: any): Promise<T> {
    return this.prisma.$transaction(callback) as Promise<T>;
  }

  async executeRaw(query: string, ...values: any[]): Promise<any> {
    return this.prisma.$executeRawUnsafe(query, ...values);
  }

  async queryRaw<T = any>(query: string, ...values: any[]): Promise<T[]> {
    return this.prisma.$queryRawUnsafe(query, ...values) as Promise<T[]>;
  }
}

export const db = DatabaseService.getInstance();
export const prisma = db.prisma;
export default db;

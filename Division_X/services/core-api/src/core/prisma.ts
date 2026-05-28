import { PrismaClient } from '@prisma/client';
import { memoryCache } from './cache/index.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const basePrisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (['Team', 'Project', 'Task', 'Tag', 'Client'].includes(model)) {
          args.where = { deletedAt: null, ...args.where };
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (['Team', 'Project', 'Task', 'Tag', 'Client'].includes(model)) {
          args.where = { deletedAt: null, ...args.where };
        }
        return query(args);
      },
      async findUnique({ model, args, query }) {
        if (['Team', 'Project', 'Task', 'Tag', 'Client'].includes(model)) {
          args.where = { deletedAt: null, ...args.where };
        }
        return query(args);
      },
      async count({ model, args, query }) {
        if (['Team', 'Project', 'Task', 'Tag', 'Client'].includes(model)) {
          args.where = { deletedAt: null, ...args.where };
        }
        return query(args);
      },
      async delete({ model, args, query }) {
        if (['Team', 'Project', 'Task', 'Tag', 'Client'].includes(model)) {
          const modelName = model.charAt(0).toLowerCase() + model.slice(1);
          return (basePrisma as any)[modelName].update({
            where: args.where,
            data: { deletedAt: new Date() }
          });
        }
        return query(args);
      },
      async deleteMany({ model, args, query }) {
        if (['Team', 'Project', 'Task', 'Tag', 'Client'].includes(model)) {
          const modelName = model.charAt(0).toLowerCase() + model.slice(1);
          return (basePrisma as any)[modelName].updateMany({
            where: args.where,
            data: { deletedAt: new Date() }
          });
        }
        return query(args);
      }
    },
    workspacePolicy: {
      async findFirst({ args, query }) {
        const cacheKey = `workspacePolicy:findFirst:${JSON.stringify(args)}`;
        const cached = memoryCache.get(cacheKey);
        if (cached !== null) return cached;
        const res = await query(args);
        memoryCache.set(cacheKey, res, 86400); // 24-hr TTL
        return res;
      },
      async findUnique({ args, query }) {
        const cacheKey = `workspacePolicy:findUnique:${JSON.stringify(args)}`;
        const cached = memoryCache.get(cacheKey);
        if (cached !== null) return cached;
        const res = await query(args);
        memoryCache.set(cacheKey, res, 86400); // 24-hr TTL
        return res;
      },
      async findMany({ args, query }) {
        const cacheKey = `workspacePolicy:findMany:${JSON.stringify(args)}`;
        const cached = memoryCache.get(cacheKey);
        if (cached !== null) return cached;
        const res = await query(args);
        memoryCache.set(cacheKey, res, 86400); // 24-hr TTL
        return res;
      },
      async create({ args, query }) {
        const res = await query(args);
        memoryCache.deletePattern('workspacePolicy:');
        return res;
      },
      async update({ args, query }) {
        const res = await query(args);
        memoryCache.deletePattern('workspacePolicy:');
        return res;
      },
      async delete({ args, query }) {
        const res = await query(args);
        memoryCache.deletePattern('workspacePolicy:');
        return res;
      },
      async updateMany({ args, query }) {
        const res = await query(args);
        memoryCache.deletePattern('workspacePolicy:');
        return res;
      },
      async deleteMany({ args, query }) {
        const res = await query(args);
        memoryCache.deletePattern('workspacePolicy:');
        return res;
      }
    }
  }
});


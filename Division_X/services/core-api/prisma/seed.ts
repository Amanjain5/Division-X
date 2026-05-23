import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'demo@divisionx.com' },
    update: {},
    create: {
      id: 'demo-user',
      email: 'demo@divisionx.com',
      passwordHash: 'fake-hash',
      name: 'Demo User',
    },
  });

  await prisma.workspace.upsert({
    where: { id: 'demo-workspace' },
    update: {},
    create: {
      id: 'demo-workspace',
      name: 'Demo Workspace',
      timezone: 'UTC',
    },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: 'demo-workspace', userId: 'demo-user' } },
    update: {},
    create: {
      workspaceId: 'demo-workspace',
      userId: 'demo-user',
      role: 'OWNER',
    },
  });

  console.log('Seeded demo user and workspace!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const projectId = 4;
  console.log(`Resetting project ${projectId}...`);
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: 'sprouting',
      deployStatus: 'idle',
      containerId: null
    }
  });
  console.log('Project status reset to Sprouting/Idle.');
  
  // Also clear any 'running' deployment logs for this project to avoid confusion
  await prisma.deploymentLog.updateMany({
    where: { projectId, status: 'running' },
    data: { status: 'failed', log: 'Cancelled due to manual repair.' }
  });
  console.log('Stale deployment logs marked as failed.');
}

main().catch(console.error).finally(() => prisma.$disconnect());

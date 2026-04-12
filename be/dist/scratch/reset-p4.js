"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
    await prisma.deploymentLog.updateMany({
        where: { projectId, status: 'running' },
        data: { status: 'failed', log: 'Cancelled due to manual repair.' }
    });
    console.log('Stale deployment logs marked as failed.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=reset-p4.js.map
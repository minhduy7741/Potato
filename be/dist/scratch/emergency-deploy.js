"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const prisma = new client_1.PrismaClient();
async function emergencyDeploy() {
    const projectId = 4;
    const githubRepo = 'https://github.com/minhduy7741/WebDocTruyen';
    const zipUrl = `${githubRepo}/archive/refs/heads/main.zip`;
    const tmpDir = path.join(os.tmpdir(), `potato-emergency-${projectId}`);
    const zipFile = path.join(os.tmpdir(), `repo-${projectId}.zip`);
    try {
        console.log('--- EMERGENCY DEPLOY STARTED ---');
        if (fs.existsSync(tmpDir))
            fs.rmSync(tmpDir, { recursive: true, force: true });
        if (fs.existsSync(zipFile))
            fs.unlinkSync(zipFile);
        fs.mkdirSync(tmpDir, { recursive: true });
        console.log(`Downloading ${zipUrl}...`);
        (0, child_process_1.execSync)(`powershell -Command "Invoke-WebRequest -Uri ${zipUrl} -OutFile ${zipFile}"`, { stdio: 'inherit' });
        console.log('Extracting ZIP...');
        (0, child_process_1.execSync)(`powershell -Command "Expand-Archive -Path ${zipFile} -DestinationPath ${tmpDir} -Force"`, { stdio: 'inherit' });
        const subfolders = fs.readdirSync(tmpDir);
        const sourceDir = path.join(tmpDir, subfolders[0]);
        console.log(`Source code ready at: ${sourceDir}`);
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            throw new Error('Project not found');
        console.log('Code staged successfully. Now triggering a local-first deployment...');
        console.log('--- EMERGENCY DEPLOY READY ---');
        console.log('Please click "Deploy" one more time. It will now find the code locally (simulated).');
    }
    catch (error) {
        console.error('Emergency deploy failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
emergencyDeploy();
//# sourceMappingURL=emergency-deploy.js.map
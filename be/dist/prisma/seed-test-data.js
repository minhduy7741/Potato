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
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting Seeding Test Data...');
    const adminEmail = 'admin@potato.com';
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
        const hashedPassword = await bcrypt.hash('adminpassword', 10);
        admin = await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                name: 'System Admin',
                role: 'ADMIN',
            },
        });
        console.log('✅ Admin user created.');
    }
    await prisma.project.deleteMany({ where: { userId: admin.id } });
    const now = new Date();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const p1 = await prisma.project.create({
        data: {
            name: 'Potato-Production',
            status: 'running',
            subdomain: 'prod-potato',
            customDomain: 'potato.io',
            sslStatus: 'active',
            sslExpiry: new Date(now.getTime() + ninetyDays),
            userId: admin.id,
            databases: {
                create: [
                    { name: 'main-db', type: 'postgres', status: 'running', connectionString: 'postgresql://postgres:potato123@localhost:20001/main' }
                ]
            }
        }
    });
    const p2 = await prisma.project.create({
        data: {
            name: 'Sprout-App',
            status: 'running',
            subdomain: 'sprout-app',
            customDomain: 'sprout.site',
            sslStatus: 'expiring_soon',
            sslExpiry: new Date(now.getTime() + threeDays),
            userId: admin.id,
            databases: {
                create: [
                    { name: 'session-cache', type: 'redis', status: 'running', connectionString: 'redis://:potato123@localhost:20002' }
                ]
            }
        }
    });
    const p3 = await prisma.project.create({
        data: {
            name: 'Garden-Legacy',
            status: 'stopped',
            subdomain: 'legacy-garden',
            sslStatus: 'none',
            userId: admin.id,
        }
    });
    console.log('✅ Seeding complete! 3 projects and 2 databases created.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-test-data.js.map
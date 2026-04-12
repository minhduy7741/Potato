import { PrismaService } from '../prisma/prisma.service';
import { NginxService } from './nginx.service';
export declare class SslService {
    private readonly prisma;
    private readonly nginxService;
    private readonly logger;
    constructor(prisma: PrismaService, nginxService: NginxService);
    handleAutoRenewal(): Promise<void>;
    issueCertificate(domain: string): Promise<{
        expiry: Date;
        certPath: string;
        keyPath: string;
    }>;
}

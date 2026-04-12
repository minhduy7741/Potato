export declare class NginxService {
    private readonly logger;
    generateProxyConfig(subdomain: string, hostPort: number, projectName: string, customDomain?: string, sslActive?: boolean): string;
    removeProxyConfig(subdomain: string): void;
}

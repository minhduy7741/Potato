export declare class NginxService {
    private readonly logger;
    private readonly configDir;
    constructor();
    generateProxyConfig(subdomain: string, hostPort: number, projectName: string, customDomain?: string, sslActive?: boolean): string;
    removeProxyConfig(subdomain: string): void;
}

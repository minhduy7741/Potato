export declare class InfrastructureController {
    private readonly logger;
    private readonly dockerSocketPaths;
    healthCheck(): Promise<{
        status: string;
        timestamp: string;
        checks: {
            dockerSocket: {
                status: string;
                socketPath: string;
                details: {
                    path: string;
                    accessible: boolean;
                }[];
            };
        };
    }>;
}

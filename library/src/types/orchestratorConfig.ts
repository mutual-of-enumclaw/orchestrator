export interface OrchestratorConfig {
    epsagon?: {
        appName: string;
        token: string;
        metadataOnly: boolean;
    };
    statusTable: string;
}

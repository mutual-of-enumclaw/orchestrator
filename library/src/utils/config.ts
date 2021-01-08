import { OrchestratorConfig } from '../types';

let config: OrchestratorConfig = null;

export function resetConfig () {
    config = null;
}

export function getConfig () {
    if (!config) {
        config = process.env.OrchestratorConfig ? JSON.parse(process.env.OrchestratorConfig) : { statusTable: process.env.statusTable };
    }

    return config;
}

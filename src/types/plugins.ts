/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { OrchestratorStage } from '.';

export interface OrchestratorSyncPlugin {
    orchestratorId: string,
    stage: OrchestratorStage
    pluginName: string,
    order: number,
    functionName: string,
    mandatory: boolean
}

export interface PluginInfo {
    pluginName: string;
    default: {
        mandatory: boolean
    };
    overrides?: {
        [key: string]: {
            mandatory: boolean
        }
    };
    order?: number
}

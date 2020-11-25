/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { OrchestratorStage } from '.';

export interface OrchestratorSyncPlugin {
    orchestratorId: string;
    stage: OrchestratorStage;
    pluginName: string;
    order: number;
    functionName: string;
    mandatory: boolean;
    pluginRegisterTimeout?: number;
    alwaysRun?: boolean;
}

export interface PluginInfo {
    pluginName: string;
    default: {
        mandatory: boolean;
        pluginRegisterTimeout?: number;
    };
    overrides?: {
        [key: string]: {
            mandatory: boolean;
        }
    };
    order?: number;
    alwaysRun?: boolean;
    idempotent?: boolean;

    /** Used as part of auto documentation */
    description?: string;

    /** Used for specifying how to group transactions in a fifo queue */
    fifoKey?: string;
}

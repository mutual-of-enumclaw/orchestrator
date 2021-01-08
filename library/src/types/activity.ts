/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { OrchestratorStatus } from '.';

export enum OrchestratorStage {
    PreProcessing = 'pre',
    BulkProcessing = 'async',
    PostProcessing = 'post'
}

export interface OrchestratorSyncStatus {
    mandatory: {[key: string]: OrchestratorStatus};
    optional: {[key: string]: OrchestratorStatus};
    status: OrchestratorStatus;
}

export interface OrchestratorAsyncStatus {
    mandatory: {[key: string]: OrchestratorStatus};
    optional: {[key: string]: OrchestratorStatus};
    status: OrchestratorStatus;
}

export interface OrchestratorActivityStatus {
    pre: OrchestratorSyncStatus;
    async: OrchestratorAsyncStatus;
    post: OrchestratorSyncStatus;
    status: OrchestratorStatus;
    pluginRegisterTimeout?: number;
}

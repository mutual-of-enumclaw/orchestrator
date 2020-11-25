/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { OrchestratorStage, OrchestratorSyncPlugin } from "../types";
export declare class OrchestratorPluginDal {
    private pluginTable;
    private orchestratorId;
    private dal;
    constructor(pluginTable: string, orchestratorId: string);
    getPlugins(stage: OrchestratorStage): Promise<Array<OrchestratorSyncPlugin>>;
}

/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { OrchestratorStage, lambdaWrapperAsync } from "@moe-tech/orchestrator";
import { PluginManager, CloudwatchEvent } from "@moe-tech/orch-activity-lib";

let stage: OrchestratorStage;

switch(process.env.stage) {
    case 'pre':
        stage = OrchestratorStage.PreProcessing;
        break;
    case 'post':
        stage = OrchestratorStage.PostProcessing;
        break;
    case 'parallel':
        stage = OrchestratorStage.BulkProcessing;
        break;
}

const pluginRemoveManager = new PluginManager(process.env.activity, stage, process.env.snsArn);
export const handler = lambdaWrapperAsync(async (event: CloudwatchEvent) => {
    console.log(JSON.stringify(event));
    await pluginRemoveManager.removePluginEvent(event);
});

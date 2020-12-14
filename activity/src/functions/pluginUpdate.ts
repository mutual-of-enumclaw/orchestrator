/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { lambdaWrapperAsync, OrchestratorStage, PluginManager, CloudwatchEvent } from '@moe-tech/orchestrator';
import { install } from 'source-map-support';

install();

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

const pluginManager = new PluginManager(process.env.activity, stage, process.env.snsArn);
export const handler = lambdaWrapperAsync(async (event: CloudwatchEvent) => {
    console.log(JSON.stringify(event));
    pluginManager.evaluateCloudwatchEvent(event);
    const functionArn = event.detail.requestParameters['functionName'];
    if(!functionArn) {
        return;
    }
    const parts = functionArn.split(':');
    if(parts.length < 7) {
        return;
    }
    const functionName = parts[6];
    const plugin = await pluginManager.pluginDal.getPlugin(functionName);
    if(!plugin) {
        return;
    }

    pluginManager.updateLambdaParams(plugin.functionName, plugin.subscriptionArn, stage);
});

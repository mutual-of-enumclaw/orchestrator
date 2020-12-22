/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { lambdaWrapperAsync, PluginManager, CloudwatchEvent, OrchestratorStage } from '@moe-tech/orchestrator';
import { install } from 'source-map-support';

install();
const arns = [process.env.parallelArn, process.env.postArn, process.env.preArn];

const stages = {
    pre: new PluginManager(process.env.activity, OrchestratorStage.PreProcessing, arns),
    post: new PluginManager(process.env.activity, OrchestratorStage.PostProcessing, arns),
    parallel: new PluginManager(process.env.activity, OrchestratorStage.BulkProcessing, arns)
}

export const handler = lambdaWrapperAsync(async (event: CloudwatchEvent) => {
    console.log(JSON.stringify(event));

    const functionName = event.detail.responseElements['functionName'];
    if(!functionName) {
        return;
    }

    await Promise.all(Object.values(stages).map(async manager => {
        const plugin = await manager.pluginDal.getPlugin(functionName);
        if(!plugin) {
            return;
        }

        await manager.updateLambdaParams(plugin.functionName, plugin.subscriptionArn, manager.pluginDal.stage);
    }));
});

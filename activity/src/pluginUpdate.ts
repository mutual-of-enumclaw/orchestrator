/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { lambdaWrapperAsync, PluginManager, CloudwatchEvent } from '@moe-tech/orchestrator';
import { getStage } from './pluginAdd';
import { install } from 'source-map-support';

install();
const arns = [process.env.parallelArn, process.env.postArn, process.env.preArn];

export const handler = lambdaWrapperAsync(async (event: CloudwatchEvent) => {
    console.log(JSON.stringify(event));
    const stage = getStage(event);
    const pluginManager = new PluginManager(process.env.activity, stage, arns);

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

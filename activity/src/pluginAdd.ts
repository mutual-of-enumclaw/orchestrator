/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { lambdaWrapperAsync, OrchestratorStage, CloudwatchEvent, PluginManager } from '@moe-tech/orchestrator';
import { install } from 'source-map-support';

install();
const arns = [process.env.parallelArn, process.env.postArn, process.env.preArn];

export const handler = lambdaWrapperAsync(async (event: CloudwatchEvent) => {
    console.log(JSON.stringify(event));
    let stage = getStage(event);

    const pluginManager = new PluginManager(process.env.activity, stage, arns);

    await pluginManager.addPluginEvent(event);
});

export function getStage(event: CloudwatchEvent): OrchestratorStage {
    if(event.detail.requestParameters.topicArn === process.env.preArn) {
        return OrchestratorStage.PreProcessing;
    }
    if (event.detail.requestParameters.topicArn === process.env.postArn) {
        return OrchestratorStage.PostProcessing;
    }
    if (event.detail.requestParameters.topicArn === process.env.parallelArn) {
        return OrchestratorStage.BulkProcessing;
    }
    return undefined as any;
}
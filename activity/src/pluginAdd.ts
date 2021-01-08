/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { lambdaWrapperAsync, OrchestratorStage, CloudwatchEvent, PluginManagementDal } from '@moe-tech/orchestrator';
import { install } from 'source-map-support';

install();
const pluginDal = new PluginManagementDal(process.env.pluginTable);

export const handler = lambdaWrapperAsync(async (event: CloudwatchEvent) => {
    console.log(JSON.stringify(event));
    if (!event) {
        throw new Error('Argument event not valid');
    }
    const stage = getStage(event);

    if (!event.detail.requestParameters?.topicArn) {
        throw new Error('Argument event topic not valid');
    }
    if (!event.detail.requestParameters?.protocol) {
        throw new Error('Argument event protocol not valid');
    }
    if (!event.detail.requestParameters?.protocol || event.detail.requestParameters?.protocol !== 'lambda') {
        throw new Error('Argument event protocol not valid');
    }
    if (!event.detail.requestParameters?.endpoint) {
        throw new Error('Argument event lambda arn not valid');
    }

    console.log('Getting lambda name');
    const lambdaArnParts = event.detail.requestParameters.endpoint.split(':');
    if (lambdaArnParts.length < 7) {
        throw new Error('Argument event lambda arn malformed');
    }
    const lambdaName = lambdaArnParts[6];
    console.log('Lambda Name: ' + lambdaName);

    const config = await pluginDal.getPluginConfig({ orchestratorId: `${process.env.activity}|${stage}`, functionName: lambdaName, subscriptionArn: event.detail.responseElements.subscriptionArn } as any);
    await pluginDal.addPlugin(process.env.activity, stage, config.subscriptionArn, config);
});

export function getStage (event: CloudwatchEvent): OrchestratorStage {
    if (event.detail.requestParameters.topicArn === process.env.preArn) {
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

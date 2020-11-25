/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { CloudwatchEvent } from '../types/cloudwatchEvent';
import { lambdaWrapperAsync, OrchestratorStage, OrchestratorStatusDal } from '@moe-tech/orchestrator';
import { PluginManager } from '../utils/pluginManager';
import { install } from 'source-map-support';
import { PluginManagementDal } from '../utils/pluginManagementDal';
import { SNS } from 'aws-sdk';

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
const sns = new SNS();
export const handler = lambdaWrapperAsync(async () => {
    await Promise.all([
        updateSubscriptions(process.env.preTopicArn, 'pre'),
        updateSubscriptions(process.env.postTopicArn, 'post'),
        updateSubscriptions(process.env.parallelTopicArn, 'async')
    ]);
});

async function updateSubscriptions(topicArn: string, stage: string) {
    let nextToken;
    do {
        const subscriptions = await sns.listSubscriptionsByTopic({
            TopicArn: topicArn,
            NextToken: nextToken
        }).promise();

        console.log(subscriptions);
        await Promise.all(subscriptions.Subscriptions.map(s => {
            if(s.Protocol !== 'lambda') {
                return;
            }
            console.log('Updating lambda registration', s);
            const functionName = s.Endpoint.split(':')[6];

            return pluginManager.updateLambdaParams(functionName, s.SubscriptionArn, stage);
        }));
        nextToken = subscriptions.NextToken;
    } while(nextToken);

    console.log(`Complete ${topicArn}`);
}

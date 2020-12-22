/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { lambdaWrapperAsync, OrchestratorStage, PluginManager } from '@moe-tech/orchestrator';
import { install } from 'source-map-support';
import { SNS } from 'aws-sdk';

install();

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
    const pluginManager = new PluginManager(process.env.activity, stage as any, [process.env.snsArn]);

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

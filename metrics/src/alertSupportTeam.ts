import * as AWS from 'aws-sdk';
import { lambdaWrapperAsync, MetricsDb, StepData } from '@moe-tech/orchestrator';
import { Handler } from 'aws-lambda';

const sns: AWS.SNS = new AWS.SNS();
const metricsDb: MetricsDb = new MetricsDb();

export const handler: Handler = lambdaWrapperAsync(async (event: StepData) => {
    if (!event || !event.uid || !event.workflow) {
        throw new Error('The event does not contain required fields');
    }

    if (!event.alertSent) {
        await sns.publish({
            TopicArn: process.env.notificationArn,
            Message: `The workflow ${event.workflow} for ${event.uid} did not finish processing in the expected time`
        }).promise();
        event.alertSent = true;
    }

    await metricsDb.putIssueFailure(event.workflow, event.uid);

    return event;
});

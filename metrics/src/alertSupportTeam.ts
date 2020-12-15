import * as AWS from 'aws-sdk';
import { lambdaWrapperAsync, MetricsDb, StepData } from '@moe-tech/orchestrator';
import { Handler } from 'aws-lambda';

let sns: AWS.SNS;
let metricsDb: MetricsDb;

export function setSns (obj: AWS.SNS) {
  if (process.env.environment !== 'unit-test') {
    throw new Error('A system is trying to use a unit test capability');
  }
  sns = obj;
}
export function setMetricsDb (obj: MetricsDb) {
  if (process.env.environment !== 'unit-test') {
    throw new Error('A system is trying to use a unit test capability');
  }
  metricsDb = obj;
}

export const handler: Handler = lambdaWrapperAsync(async (event: StepData) => {
  if (!event || !event.uid || !event.workflow) {
    throw new Error('The event does not contain required fields');
  }
  if (!sns) {
    sns = new AWS.SNS();
  }
  if (!metricsDb) {
    metricsDb = new MetricsDb();
  }

  if (!event.alertSent) {
    await sns.publish({
      TopicArn: process.env.notificationArn,
      Message: `The workflow ${event.workflow} for ${event.uid} did not finish processing in the expected time`
    }).promise();
    event.alertSent = true;
  }

  metricsDb.putIssueFailure(event.workflow, event.uid);

  return event;
});

import * as AWS from 'aws-sdk';
import { Handler, DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { StepData, WorkflowRegister, lambdaWrapperAsync } from '@moe-tech/orchestrator';

let stepFunctions: AWS.StepFunctions;
let workflowRegister: WorkflowRegister;

export const handler: Handler = lambdaWrapperAsync(async function handler (event: DynamoDBStreamEvent) {
  if (!event || !event.Records) {
    console.log('No event data supplied');
    return;
  }

  if (!stepFunctions) {
    stepFunctions = new AWS.StepFunctions();
    workflowRegister = new WorkflowRegister(process.env.WorkflowRegistry);
  }

  const promises = [];
  event.Records.forEach(record => {
    promises.push(processRecord(record));
  });

  await Promise.all(promises);
});

async function processRecord (record: DynamoDBRecord) {
  if (!record || !record.dynamodb || !record.dynamodb.NewImage) {
    console.log('record information found');
    // Do not throw error, as we should remove this message from the queue
    return;
  }
  if (record.dynamodb.OldImage) {
    console.log('event is an update. skipping processing for update');
    return;
  }

  const data = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
  if (!data.uid || !data.workflow) {
    console.log('uid or workflow not found in message');
    return;
  }

  const slimData = {
    uid: data.uid,
    workflow: data.workflow,
    alertSent: false
  } as StepData;

  await stepFunctions.startExecution({
    name: `${data.uid}-${new Date().getTime()}`,
    stateMachineArn: process.env.stateMachineArn,
    input: JSON.stringify(slimData)
  }).promise();

  await workflowRegister.register(data.workflow);
}

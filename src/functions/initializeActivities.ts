import { DynamoDB } from 'aws-sdk';
import { OrchestratorComponentState, lambdaWrapperAsync, OrchestratorWorkflowStatus } from '..';

let dynamodb: DynamoDB.DocumentClient = null;

export function setDynamoDal(dal: DynamoDB.DocumentClient) {
    if(process.env.environment !== 'unit-test') {
        throw new Error('Unit testing feature being used outside of unit testing');
    }
    dynamodb = dal;
}

export const initialize = lambdaWrapperAsync(async (event: OrchestratorWorkflowStatus) => {
    if(!event || !event.uid) {
        throw new Error('Event is either invalid or malformed');
    }
    const metadata = event.metadata;
    if(!metadata || !metadata.workflow) {
         throw new Error('Event metadata is either invalid or malformed');
    }
    if(!event.stages) {
        throw new Error('Stages has not been defined');
    }
    if(!dynamodb) {
        dynamodb = new DynamoDB.DocumentClient();
    }

    if(!event.status) {
        event.status = {
            state: OrchestratorComponentState.NotStarted,
        };
    }
    event.activities = {};
    if(event.stages) {
        for(const i in event.stages) {
            event.activities[i] = {
                pre: {
                    mandatory: {
                    },
                    optional: {

                    },
                    status: {
                        state: OrchestratorComponentState.NotStarted,
                        message: null
                    }
                },
                async: {
                    mandatory: {
                    },
                    optional: {

                    },
                    status: {
                        state: OrchestratorComponentState.NotStarted,
                        message: null
                    }
                },
                post: {
                    mandatory: {
                    },
                    optional: {

                    },
                    status: {
                        state: OrchestratorComponentState.NotStarted,
                        message: null
                    }
                },
                status: {
                    state: OrchestratorComponentState.NotStarted,
                    message: null
                }
            };
        }
        delete event.stages;
    }
    event.workflow = event.metadata.workflow;
    event.currentDate = new Date().getTime();
    await dynamodb.put({
        TableName: process.env.statusTable,
        Item: event
    }).promise();

    return event;
});

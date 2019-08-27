import { DynamoDB, AWSError } from 'aws-sdk';
import {
    OrchestratorComponentState, lambdaWrapperAsync, OrchestratorWorkflowStatus,
    OrchestratorActivityStatus, OrchestratorAsyncStatus, OrchestratorSyncStatus
} from '..';
import { PromiseResult } from 'aws-sdk/lib/request';
import { PutItemOutput, GetItemOutput } from 'aws-sdk/clients/dynamodb';

let dynamodb: DynamoDB.DocumentClient = null;

export function setDynamoDal(dal: DynamoDB.DocumentClient) {
    if (process.env.environment !== 'unit-test') {
        throw new Error('Unit testing feature being used outside of unit testing');
    }
    dynamodb = dal;
}

export const initialize = lambdaWrapperAsync(async (event: OrchestratorWorkflowStatus) => {
    if (!event || !event.uid) {
        throw new Error('Event is either invalid or malformed');
    }
    const metadata = event.metadata;
    if (!metadata || !metadata.workflow) {
        throw new Error('Event metadata is either invalid or malformed');
    }
    if (!event.stages) {
        throw new Error('Stages has not been defined');
    }
    if (!dynamodb) {
        dynamodb = new DynamoDB.DocumentClient();
    }
    const savedData = await getActivity(event);
    event.activities = {};
    if (savedData && savedData.activities) {
        event.activities = savedData.activities;
        if(!event.metadataOverride && JSON.stringify(event.metadata) !== JSON.stringify(savedData.metadata)) {
            throw new Error(`metadata does not match metadata with same UID from database`);   
        }
    }
    if (!event.status) {
        event.status = {
            state: OrchestratorComponentState.NotStarted,
        };
    }
    if (event.stages) {
        for (const i in event.stages) {
            getActivityForStage(i, event);
        }
        delete event.stages;
    }
    event.workflow = event.metadata.workflow;
    event.currentDate = new Date().getTime();
    await save(event);

    return event;
});

function getActivityForStage(stage: string, event: OrchestratorWorkflowStatus) {
    if (event.activities[stage]) {
        resetErrorStatusInActivity(event.activities[stage]);
        return;
    }
    event.activities[stage] = {
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
function resetErrorStatusInActivity(activityStatus: OrchestratorActivityStatus): void {
    activityStatus.status.state = OrchestratorComponentState.NotStarted;
    resetErrorStatusInSection(activityStatus.pre);
    resetErrorStatusInSection(activityStatus.async);
    resetErrorStatusInSection(activityStatus.post);
}
export function resetErrorStatusInSection(status: OrchestratorAsyncStatus| OrchestratorSyncStatus): void {
    if (!status) {
        return;
    }
    status.status.state = OrchestratorComponentState.NotStarted;
    if (!status.mandatory) {
        status.mandatory = {};
    }
    for (const plugin of Object.keys(status.mandatory)) {
        const state = status.mandatory[plugin];
        if (state &&
            (state.state === OrchestratorComponentState.Error
                || state.state === OrchestratorComponentState.OptionalError
            )) {
                state.state = OrchestratorComponentState.NotStarted;
        }
    }
    
    if (!status.optional) {
        status.optional = {};
    }
    for (const plugin of Object.keys(status.optional)) {
        const state = status.optional[plugin];
        if (state &&
            (state.state === OrchestratorComponentState.Error
                || state.state === OrchestratorComponentState.OptionalError
            )) {
                state.state = OrchestratorComponentState.NotStarted;
        }
    }


}
async function getActivity(event: OrchestratorWorkflowStatus): Promise<OrchestratorWorkflowStatus> {
    const ret = await dynamodb.get({
        TableName: process.env.statusTable,
        Key: {
            uid: event.uid,
            workflow: event.workflow
        }
    }).promise();
    if (!ret || !ret.Item) {
        return;
    }
    const output = ret.Item as OrchestratorWorkflowStatus;
    return output;
}

async function save(event: OrchestratorWorkflowStatus): Promise<PromiseResult<PutItemOutput, AWSError>> {
    return dynamodb.put({
        TableName: process.env.statusTable,
        Item: event
    }).promise();
}

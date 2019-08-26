import { DynamoDB, AWSError } from 'aws-sdk';
import {
    OrchestratorComponentState, lambdaWrapperAsync, OrchestratorWorkflowStatus,
    OrchestratorActivityStatus, OrchestratorAsyncStatus, OrchestratorSyncStatus
} from '..';
import { PromiseResult } from 'aws-sdk/lib/request';
import { PutItemOutput, GetItemOutput } from 'aws-sdk/clients/dynamodb';
import { OrchestratorStatusDal } from '../dataAccessLayers/orchestratorStatusDal';

let dynamodb: OrchestratorStatusDal = undefined;

export function setDynamoDal(dal: OrchestratorStatusDal) {
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
        dynamodb = new OrchestratorStatusDal(process.env.statusTable, '');
    }
    const savedData = await dynamodb.getStatusObject(event.uid, event.workflow);
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
    await dynamodb.putInitialWorkflowStatus(event);

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
                state: OrchestratorComponentState.NotStarted
            }
        },
        async: {
            mandatory: {
            },
            optional: {

            },
            status: {
                state: OrchestratorComponentState.NotStarted
            }
        },
        post: {
            mandatory: {
            },
            optional: {

            },
            status: {
                state: OrchestratorComponentState.NotStarted
            }
        },
        status: {
            state: OrchestratorComponentState.NotStarted
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
    clearErrorForType('mandatory', status);
    clearErrorForType('optional', status);
}
function clearErrorForType(
    type: 'optional' | 'mandatory', 
    status: OrchestratorAsyncStatus| OrchestratorSyncStatus): void {
        if (!status[type]) {
            status[type] = {};
        }
        for (const plugin of Object.keys(status[type])) {
            const state = status[type][plugin];
            if (state &&
                (state.state === OrchestratorComponentState.Error
                    || state.state === OrchestratorComponentState.OptionalError
                )) {
                    state.state = OrchestratorComponentState.NotStarted;
            }
        }
}

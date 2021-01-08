import { DynamoDB } from 'aws-sdk';
import {
    OrchestratorComponentState, lambdaWrapperAsync, OrchestratorWorkflowStatus,
    OrchestratorActivityStatus, OrchestratorAsyncStatus, OrchestratorSyncStatus
} from '@moe-tech/orchestrator';

const dynamodb: DynamoDB.DocumentClient = new DynamoDB.DocumentClient();

export async function initializeWorkflow (event: OrchestratorWorkflowStatus) {
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

    // Move workflow over to parent early to avoid confusion in
    // usage of the data model
    event.workflow = event.metadata.workflow;

    const savedData = await getActivity(event);
    event.activities = {};
    if (savedData) {
        console.log('Using saved activity status and checking metadata');
        event.activities = (savedData.activities) ? savedData.activities : event.activities;
        const previousMetadata = JSON.stringify(savedData.metadata, Object.keys(savedData.metadata).sort());
        const incomingMetadata = JSON.stringify(event.metadata, Object.keys(event.metadata).sort());
        if (!event.metadataOverride && previousMetadata !== incomingMetadata) {
            console.log(`Previous: ${previousMetadata}`);
            console.log(`Incoming: ${incomingMetadata}`);
            throw new Error('metadata does not match metadata with same UID from database');
        }
    }

    if (!event.status) {
        event.status = {
            state: OrchestratorComponentState.NotStarted
        };
    }
    if (event.stages) {
        console.log('Building out activities from stages for workflow');
        for (const i in event.stages) {
            getActivityForStage(i, event, event.stages[i]);
        }
        delete event.stages;
    }

    event.currentDate = new Date().getTime();

    // Save status to status table
    await dynamodb.put({
        TableName: process.env.statusTable,
        Item: event,
        ConditionExpression: (savedData) ? undefined : 'attribute_not_exists(uid)'
    }).promise();

    return event;
}

function getActivityForStage (stage: string, event: OrchestratorWorkflowStatus, setTimeout: any) {
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

function resetErrorStatusInActivity (activityStatus: OrchestratorActivityStatus): void {
    activityStatus.status.state = OrchestratorComponentState.NotStarted;
    resetErrorStatusInSection(activityStatus.pre);
    resetErrorStatusInSection(activityStatus.async);
    resetErrorStatusInSection(activityStatus.post);
}

export function resetErrorStatusInSection (status: OrchestratorAsyncStatus| OrchestratorSyncStatus): void {
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
            (state.state === OrchestratorComponentState.Error ||
                state.state === OrchestratorComponentState.OptionalError
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
            (state.state === OrchestratorComponentState.Error ||
                state.state === OrchestratorComponentState.OptionalError
            )) {
            state.state = OrchestratorComponentState.NotStarted;
        }
    }
}

export async function getActivity (event: OrchestratorWorkflowStatus): Promise<OrchestratorWorkflowStatus> {
    console.log(`Attemting to retrieve previous workflow ('${event.uid}', '${event.workflow}')`);
    const ret = await dynamodb.get({
        TableName: process.env.statusTable,
        Key: {
            uid: event.uid,
            workflow: event.workflow
        }
    }).promise();

    if (!ret || !ret.Item) {
        console.log('Previous workflow not found');
        return;
    }

    console.log('workflow successfully retrieved');
    const output = ret.Item as OrchestratorWorkflowStatus;

    if (output && output.activities) {
        Object.keys(output.activities).forEach(k => {
            const activities = output.activities[k];
            Object.keys(output.activities[k]).forEach(stageKey => {
                if ('|pre|async|post|'.indexOf(stageKey) < 0) {
                    return;
                }
                const stage: OrchestratorSyncStatus = activities[stageKey];
                Object.keys(stage.mandatory).forEach(pKey => {
                    delete stage.mandatory[pKey].message;
                });
                Object.keys(stage.optional).forEach(pKey => {
                    delete stage.optional[pKey].message;
                });

                delete stage.status.message;
                delete stage.status.token;
                console.log(JSON.stringify(stage));
            });

            delete activities.status.message;
            delete activities.status.token;
        });
    }

    return output;
}

export const initialize = lambdaWrapperAsync(initializeWorkflow);

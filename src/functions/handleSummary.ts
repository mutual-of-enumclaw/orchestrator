/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { lambdaWrapperAsync } from '../utils/epsagonUtils';
import {
    OrchestratorActivityStatus, OrchestratorStatus, OrchestratorComponentState,
    OrchestratorWorkflowStatus
}
    from '..';
import * as AWS from 'aws-sdk';

export class StatusSummary {
    public error: boolean;
    public complete: boolean;
    public mandatoryComplete: boolean;
    public optionalError: boolean;
    public notStarted: boolean;

    constructor() {
        this.error = false;
        this.optionalError = false;
        this.complete = true;
        this.mandatoryComplete = true;
        this.notStarted = true;
    }

    public getState(): OrchestratorComponentState {
        let state: OrchestratorComponentState = OrchestratorComponentState.NotStarted;
        if (this.error) {
            state = OrchestratorComponentState.Error;
        } else if (this.complete) {
            state = OrchestratorComponentState.Complete;
        } else if (this.optionalError) {
            state = OrchestratorComponentState.OptionalError;
        } else if (this.mandatoryComplete) {
            state = OrchestratorComponentState.MandatoryCompleted;
        } else if (!this.notStarted) {
            state = OrchestratorComponentState.InProgress;
        }
        return state;
    }

    public updateState(state: OrchestratorComponentState) {
        if (state !== OrchestratorComponentState.NotStarted) {
            this.notStarted = false;
        }
        if (state === OrchestratorComponentState.OptionalError) {
            this.optionalError = true;
        }
        if (state !== OrchestratorComponentState.Complete) {
            // console.log('State not complete ' + state);
            this.complete = false;
        }
        if (!(state === OrchestratorComponentState.Complete ||
            state === OrchestratorComponentState.MandatoryCompleted)) {
            // console.log('State not mandatory complete ' + state);
            this.mandatoryComplete = false;
        }
        if (state === OrchestratorComponentState.Error) {
            // console.log('State is error');
            this.error = true;
        }
    }
}

let dynamoDal: AWS.DynamoDB.DocumentClient = new AWS.DynamoDB.DocumentClient();
export function setDynamoDal(dal: AWS.DynamoDB.DocumentClient) {
    if (process.env.environment !== 'unit-test') {
        throw new Error('Unit testing feature being used outside of unit testing');
    }
    dynamoDal = dal;
}

export const updateActivityStatus = lambdaWrapperAsync(async (event: DynamoDBStreamEvent) => {
    console.log(JSON.stringify(event));
    if (!event || !event.Records) {
        return;
    }
    const promises = [];
    event.Records.forEach(record => {
        promises.push(processRecord(record));
    });

    await Promise.all(promises);
});

function setFieldName(name: string, fieldNames: any) {
    if (!fieldNames['#' + name]) {
        fieldNames['#' + name] = name;
    }
}

async function processRecord(record: DynamoDBRecord) {
    if (!record.dynamodb.NewImage) {
        console.log('Status object was removed, no processing needed');
        return;
    }
    const statusObj = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) as OrchestratorWorkflowStatus;
    const updates = [];
    const attributes = {};
    const fieldNames = {};
    const workflowStatus = new StatusSummary();
    // if (statusObj.status.state === OrchestratorComponentState.Complete) {
    //     return;
    // }

    for (const i in statusObj.activities) {
        if (statusObj.activities[i] === null) {
            continue;
        }
        if (!validateActivity(i, statusObj.activities, workflowStatus, updates, attributes, fieldNames)) {
            return;
        }
    }
    const workflowState = workflowStatus.getState();
    if (statusObj.status.state !== workflowState) {
        console.log(`Setting status.state to ${workflowState}`);
        const attributeName = `:workflowstate`;
        updates.push(`#status.#state = ${attributeName}`);
        attributes[attributeName] = workflowState;
        setFieldName('status', fieldNames);
        setFieldName('state', fieldNames);
        statusObj.status.state = workflowState;
    }

    let expression = '';
    for (const i in updates) {
        const item = updates[i];
        if (expression.length > 0) {
            expression += ', ';
        }
        expression += item;
    }

    if (expression) {
        const params = {
            TableName: process.env.statusTable,
            Key: { uid: statusObj.uid, workflow: statusObj.workflow },
            UpdateExpression: `set ${expression}`,
            ExpressionAttributeNames: fieldNames,
            ExpressionAttributeValues: attributes
        };
        console.log(`Updating status in dynamo ${JSON.stringify(params)}`);
        await dynamoDal.update(params).promise();
    }
}

export function validateActivity(
    activity: string, statusObj: { [key: string]: OrchestratorActivityStatus }, workflowStatus: StatusSummary,
    updates: string[], attributes: any, fieldNames: any): OrchestratorActivityStatus {

    console.log(`Checking status for ${activity}`);
    const activityStatus = statusObj[activity] as OrchestratorActivityStatus;
    if (!activityStatus.async || !activityStatus.pre || !activityStatus.post || !activityStatus.status) {
        console.log('Status definition is not compatible with updating');
        return;
    }
    validateActivityStages(activity, activityStatus, updates, attributes, fieldNames);
    const activityStatusSummary = new StatusSummary();
    for (const ii in activityStatus) {
        if (ii === 'status') {
            continue;
        }
        console.log(`activityStatus[ii] ${JSON.stringify(activityStatus[ii])}`);
        const statObj = activityStatus[ii].status as OrchestratorStatus;
        activityStatusSummary.updateState(statObj.state);
    }

    console.log(`activityStatusSummary after activityStatus[ii] ${JSON.stringify(activityStatusSummary)}`);
    const state = activityStatusSummary.getState();
    workflowStatus.updateState(state);

    if (activityStatus.status.state !== state) {
        console.log(`Setting ${activity}.status.state to ${state}`);
        const attributeName = `:${activity}state`;
        updates.push(`#activities.#${activity}.#status.#state = ${attributeName}`);
        attributes[attributeName] = state;
        setFieldName('activities', fieldNames);
        setFieldName(activity, fieldNames);
        setFieldName('status', fieldNames);
        setFieldName('state', fieldNames);
        activityStatus.status.state = state;
    }
    return activityStatus;

}

function validateActivityStages(
    activity: string, activityStatus: OrchestratorActivityStatus,
    updates: string[], attributes: any, fieldNames: any) {

    validateStage(activity, activityStatus, updates, attributes, fieldNames, 'async');
    validateStage(activity, activityStatus, updates, attributes, fieldNames, 'pre');
    validateStage(activity, activityStatus, updates, attributes, fieldNames, 'post');
}

export function validateStage(
    activity: string, activityStatus: OrchestratorActivityStatus,
    updates: string[], attributes: any, fieldNames: any, stage: string) {

    let state: OrchestratorComponentState = activityStatus[stage].status.state;
    let asyncComplete = true;
    let asyncError = false;
    let hasSubItems = false;
    for (const ii in activityStatus[stage].mandatory) {
        hasSubItems = true;
        const component = activityStatus[stage].mandatory[ii] as OrchestratorStatus;

        if (component.state === OrchestratorComponentState.InProgress && asyncComplete) {
            console.log('Components are not all complete');
            asyncComplete = false;
            state = OrchestratorComponentState.InProgress;
        }
        if (component.state === OrchestratorComponentState.Error) {
            console.log('Setting mandatory to error state');
            state = OrchestratorComponentState.Error;
            asyncError = true;
            break;
        }
    }

    if (!hasSubItems && state === OrchestratorComponentState.NotStarted) {
        state = OrchestratorComponentState.NotStarted;
        asyncComplete = false;
    }

    if (asyncComplete && !asyncError) {
        console.log('All mandatory components have completed');
        state = OrchestratorComponentState.MandatoryCompleted;
    }
    if (!asyncError) {
        for (const ii in activityStatus[stage].optional) {
            const component = activityStatus[stage].optional[ii] as OrchestratorStatus;

            if (component.state === OrchestratorComponentState.InProgress) {
                console.log('Optional components are not all complete');
                asyncComplete = false;
            }
            if (component.state === OrchestratorComponentState.Error) {
                console.log('Setting mandatory to optional error state');
                state = OrchestratorComponentState.OptionalError;
                asyncError = true;
                break;
            }
        }
        if (asyncComplete && !asyncError) {
            state = OrchestratorComponentState.Complete;
        }

    }

    if (activityStatus[stage].status.state !== state) {
        console.log(`Setting ${activity}.${stage}.status.state to ${state}`);
        const attributeName = `:${activity}${stage}state`;
        updates.push(`#activities.#${activity}.#${stage}.#status.#state = ${attributeName}`);
        attributes[attributeName] = state;
        setFieldName('activities', fieldNames);
        setFieldName(activity, fieldNames);
        setFieldName('async', fieldNames);
        setFieldName('status', fieldNames);
        setFieldName('state', fieldNames);
        activityStatus[stage].status.state = state;
    }
}

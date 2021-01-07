/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import {
    OrchestratorActivityStatus, OrchestratorStatus, OrchestratorComponentState,
    OrchestratorWorkflowStatus, OrchestratorStage,
    getPluginRegisterTimeout,
    OrchestratorStatusDal, OrchestratorPluginDal,
    lambdaWrapperAsync, setError
} from '@moe-tech/orchestrator';
import { DynamoDB, StepFunctions } from 'aws-sdk';

export class StatusSummary {
    public error: boolean;
    public complete: boolean;
    public mandatoryComplete: boolean;
    public optionalError: boolean;
    public notStarted: boolean;

    constructor () {
        this.error = false;
        this.optionalError = false;
        this.complete = true;
        this.mandatoryComplete = true;
        this.notStarted = true;
    }

    public getState (): OrchestratorComponentState {
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

    public updateState (state: OrchestratorComponentState) {
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

const dynamoDal: DynamoDB.DocumentClient = new DynamoDB.DocumentClient();
const stepfunctions = new StepFunctions();

export const updateActivityStatus = lambdaWrapperAsync(async (event: DynamoDBStreamEvent) => {
    console.log(JSON.stringify(event));
    if (!event || !event.Records) {
        return;
    }

    const toProcess = deDupe(event.Records);
    const promises = [];
    toProcess.forEach(record => {
        promises.push(processRecord(record));
    });

    await Promise.all(promises);
});

function deDupe (records: DynamoDBRecord[]): DynamoDBRecord[] {
    const toProcess = {};
    records.forEach(record => {
        if (record.dynamodb.NewImage && record.dynamodb.NewImage.uid.S) {
            toProcess[record.dynamodb.NewImage.uid.S] = record;
        }
    });
    return Object.values(toProcess);
}

function setFieldName (name: string, fieldNames: any) {
    if (!fieldNames['#' + name]) {
        fieldNames['#' + name] = name;
    }
}

async function processRecord (record: DynamoDBRecord) {
    const streamDate = new Date(new Date('1/1/1970').getTime() + (record.dynamodb.ApproximateCreationDateTime * 1000));
    console.log(`Stream time: ${streamDate.toString()}`);
    const statusObj = DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) as OrchestratorWorkflowStatus;
    const updates = [];
    const attributes = {};
    const fieldNames = {};
    const workflowStatus = new StatusSummary();

    for (const i in statusObj.activities) {
        if (statusObj.activities[i] === null) {
            continue;
        }
        if (!await validateActivity(i, statusObj.activities, workflowStatus, updates,
            attributes, fieldNames, statusObj, streamDate)) {
            return;
        }
    }
    const workflowState = workflowStatus.getState();
    if (statusObj.status.state !== workflowState) {
        console.log(`Setting status.state to ${workflowState}`);
        const attributeName = ':workflowstate';
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

export async function validateActivity (
    activity: string, statusObj: { [key: string]: OrchestratorActivityStatus }, workflowStatus: StatusSummary,
    updates: string[], attributes: any, fieldNames: any, overall: OrchestratorWorkflowStatus,
    streamDate: Date): Promise<OrchestratorActivityStatus> {
    console.log(`Checking status for ${activity}`);
    const activityStatus = statusObj[activity] as OrchestratorActivityStatus;
    if (!activityStatus.async || !activityStatus.pre || !activityStatus.post || !activityStatus.status) {
        console.log('Status definition is not compatible with updating');
        return;
    }
    await validateActivityStages(activity, activityStatus, updates, attributes, fieldNames, overall, streamDate);
    const activityStatusSummary = new StatusSummary();
    for (const ii in activityStatus) {
        if (ii === 'status') {
            continue;
        }
        console.log(`activityStatus[${ii}] ${JSON.stringify(activityStatus[ii])}`);
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

async function validateActivityStages (
    activity: string, activityStatus: OrchestratorActivityStatus,
    updates: string[], attributes: any, fieldNames: any, overall: OrchestratorWorkflowStatus,
    streamDate: Date) {
    await Promise.all([
        validateStage(activity, activityStatus, updates, attributes, fieldNames, 'async', overall, streamDate),
        validateStage(activity, activityStatus, updates, attributes, fieldNames, 'pre', overall, streamDate),
        validateStage(activity, activityStatus, updates, attributes, fieldNames, 'post', overall, streamDate)
    ]);
}

export async function validateStage (
    activity: string, activityStatus: OrchestratorActivityStatus,
    updates: string[], attributes: any, fieldNames: any, stage: string, overall: OrchestratorWorkflowStatus,
    streamDate: Date) {
    const notComplete = [OrchestratorComponentState.NotStarted, OrchestratorComponentState.InProgress];
    let state: OrchestratorComponentState = activityStatus[stage].status.state;
    let asyncComplete = true;
    let asyncError = null;
    let hasSubItems = false;
    for (const ii in activityStatus[stage].mandatory) {
        hasSubItems = true;
        const component = activityStatus[stage].mandatory[ii] as OrchestratorStatus;

        if (notComplete.includes(component.state) && asyncComplete) {
            console.log('Components are not all complete');
            asyncComplete = false;
            state = component.state;
        }
        if (component.state === OrchestratorComponentState.Error) {
            console.log('Setting mandatory to error state');
            state = OrchestratorComponentState.Error;
            asyncError = ii;
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
                asyncError = ii;
                break;
            }
        }
        if (asyncComplete && !asyncError) {
            state = OrchestratorComponentState.Complete;
        }
    }

    if (activityStatus[stage].status.state !== state || (state === OrchestratorComponentState.Complete &&
        activityStatus[stage].status.token && activityStatus[stage].status.token !== ' ')) {
        console.log(`Setting ${activity}.${stage}.status.state to ${state}`);
        const attributeName = `:${activity}${stage}state`;
        updates.push(`#activities.#${activity}.#${stage}.#status.#state = ${attributeName}`);
        attributes[attributeName] = state;
        setFieldName('activities', fieldNames);
        setFieldName(activity, fieldNames);
        setFieldName(stage, fieldNames);
        setFieldName('status', fieldNames);
        setFieldName('state', fieldNames);
        activityStatus[stage].status.state = state;

        if (state === OrchestratorComponentState.Complete ||
            state === OrchestratorComponentState.Error ||
            state === OrchestratorComponentState.OptionalError) {
            if (activityStatus[stage].status.token && activityStatus[stage].status.token !== ' ') {
                let sendStatusEvent = true;
                if (activityStatus[stage].status.startTime) {
                    const startTime = new Date(activityStatus[stage].status.startTime);
                    const pluginDal = new OrchestratorPluginDal(process.env.pluginTable, activity);
                    const plugins = (await pluginDal.getPlugins(stage as OrchestratorStage)).filter(x => {
                        if (x.mandatory) {
                            return false;
                        }
                        return !activityStatus[stage].optional[x.pluginName];
                    });
                    const MIN_REGISTRATION_TIME = getPluginRegisterTimeout(overall, activity, plugins);
                    if (startTime.getTime() > streamDate.getTime() - MIN_REGISTRATION_TIME) {
                        console.log('Status update too fast, ensuring no more registrations occur');
                        let waitTime = MIN_REGISTRATION_TIME - (streamDate.getTime() - startTime.getTime());
                        console.log(`Waiting for ${waitTime} milliseconds`);
                        if (waitTime > MIN_REGISTRATION_TIME) {
                            waitTime = MIN_REGISTRATION_TIME;
                        }
                        await new Promise<void>((resolve) => {
                            setTimeout(
                                () => {
                                    resolve();
                                },
                                waitTime);
                        });

                        const statusDal = new OrchestratorStatusDal();
                        const newStatus = await statusDal.getStatusObject(overall.uid, overall.workflow, true);

                        if (Object.keys(activityStatus[stage].mandatory).length !==
                            Object.keys(newStatus.activities[activity][stage].mandatory).length &&
                            Object.keys(activityStatus[stage].optional).length !==
                            Object.keys(newStatus.activities[activity][stage].optional).length) {
                            console.log('Setting send event to false');
                            sendStatusEvent = false;
                        }
                    }
                }

                if (sendStatusEvent) {
                    console.log('Sending task status');
                    try {
                        if (state === OrchestratorComponentState.Error ||
                            state === OrchestratorComponentState.OptionalError) {
                            await stepfunctions.sendTaskFailure({
                                cause: asyncError,
                                taskToken: activityStatus[stage].status.token
                            }).promise();

                            delete activityStatus[stage].status.token;
                        } else if (state === OrchestratorComponentState.Complete) {
                            await stepfunctions.sendTaskSuccess({
                                output: JSON.stringify(state),
                                taskToken: activityStatus[stage].status.token
                            }).promise();

                            delete activityStatus[stage].status.token;
                        }
                    } catch (err) {
                        console.log(JSON.stringify(err));
                        if (err.code !== 'TaskTimedOut') {
                            throw err;
                        }
                    }
                }
            } else if (stage === OrchestratorStage.BulkProcessing) {
                const errorText =
                    `Activity "${activity}".async plugin state set to "${state}" without step function token`;
                console.log(errorText);
                if (process.env.epsagonToken) {
                    setError(new Error(errorText));
                }
            }
        }
    }
}

/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import {
    OrchestratorComponentState, OrchestratorStage, stepLambdaAsyncWrapper, OrchestratorStatusDal,
    OrchestratorWorkflowStatus, getPluginRegisterTimeout, OrchestratorActivityStatus, OrchestratorPluginDal,
    SNSUtils
}
    from '@moe-tech/orchestrator';
import { install } from 'source-map-support';
import { StepFunctions } from 'aws-sdk';

install();

const stepfunctions = new StepFunctions();
const activity: string = process.env.activity;
const sns: SNSUtils = new SNSUtils(process.env.snsTopic);
const statusDal: OrchestratorStatusDal = new OrchestratorStatusDal();
const pluginDal: OrchestratorPluginDal = new OrchestratorPluginDal(process.env.pluginTable, activity);

interface AsyncParameters {
    data: OrchestratorWorkflowStatus,
    asyncToken: string
}

export const fanOut = stepLambdaAsyncWrapper(async (asyncEvent: AsyncParameters) => {
    if (!asyncEvent || !asyncEvent.asyncToken || !asyncEvent.data) {
        throw new Error('Async event data not recieved');
    }

    const event = asyncEvent.data;
    if (!event) {
        throw new Error('Event data unexpected');
    }
    if (!event.uid) {
        throw new Error(`Event data unexpected (uid: '${event.uid}')`);
    }

    console.log('Retrieving registered plugins');
    const plugins = await pluginDal.getPlugins(OrchestratorStage.BulkProcessing);

    if (!plugins || plugins.length === 0 || await sns.getSubscriberCount() === 0) {
        console.log('No subscribers, updating status and returning');
        await stepfunctions.sendTaskSuccess({
            output: JSON.stringify(OrchestratorComponentState.Complete),
            taskToken: asyncEvent.asyncToken
        }).promise();

        await statusDal.updateStageStatus(
            event.uid, event.workflow, activity, OrchestratorStage.BulkProcessing,
            OrchestratorComponentState.Complete, ' ');

        return OrchestratorComponentState.Complete;
    }

    console.log('Retrieving status object');
    const overallStatus = await statusDal.getStatusObject(event.uid, event.metadata.workflow);

    if (!overallStatus) {
        throw new Error('The status object cannot be found');
    }

    if (!overallStatus.activities[activity]) {
        throw new Error('The orchistration id has not been provisioned');
    }

    const statusObject: {[key: string]: OrchestratorActivityStatus} = {};
    statusObject[activity] = overallStatus.activities[activity];

    await Promise.all(plugins.filter(x => x.mandatory).map((x) => {
        if (event.activities &&
            event.activities[activity] &&
            event.activities[activity].async.mandatory[x.pluginName]) {
            // Handle case where plugin is already registered
            return;
        }
        return statusDal.updatePluginStatus(
            event.uid, event.workflow,
            activity, OrchestratorStage.BulkProcessing, true, x.pluginName,
            OrchestratorComponentState.NotStarted, ' ');
    }));

    const globalMetadata = {
        now: new Date().getTime(),
        ...event.metadata,
        uid: event.uid
    } as any;

    console.log('Setting activity state to in progress');
    const startTime = new Date();
    await statusDal.updateStageStatus(
        event.uid, event.workflow, activity, OrchestratorStage.BulkProcessing,
        OrchestratorComponentState.InProgress, ' ', startTime, asyncEvent.asyncToken);

    let message = JSON.stringify({
        orchestratorId: process.env.orchestratorId,
        status: overallStatus.status,
        activity,
        activities: statusObject,
        stage: OrchestratorStage.BulkProcessing,
        ...globalMetadata
    });
    if (message.length * 2 > 256000) {
        statusObject[activity].async.mandatory = {};
        statusObject[activity].async.optional = {};
        if (statusObject[activity].async.status) {
            delete statusObject[activity].async.status.message;
            delete statusObject[activity].async.status.token;
        }
        statusObject[activity].pre.mandatory = {};
        statusObject[activity].pre.optional = {};
        if (statusObject[activity].pre.status) {
            delete statusObject[activity].async.status.message;
            delete statusObject[activity].async.status.token;
        }
        statusObject[activity].post.mandatory = {};
        statusObject[activity].post.optional = {};
        if (statusObject[activity].post.status) {
            delete statusObject[activity].async.status.message;
            delete statusObject[activity].async.status.token;
        }

        if (statusObject[activity].status) {
            delete statusObject[activity].status.token;
            delete statusObject[activity].status.message;
        }

        message = JSON.stringify({
            orchestratorId: process.env.orchestratorId,
            status: overallStatus.status,
            activity,
            activities: statusObject,
            stage: OrchestratorStage.BulkProcessing,
            ...globalMetadata
        });
    }

    const result = await sns.publishWithMetadata(message, globalMetadata);
    console.log(`publishWithMetadata result: ${JSON.stringify(result)}`);

    const timeout = getPluginRegisterTimeout(overallStatus, activity, plugins);
    if (timeout !== 0) {
        await new Promise<void>((resolve) => {
            setTimeout(
                () => {
                    resolve();
                },
                timeout);
        });
    }

    const updatedStatus = await statusDal.getStatusObject(event.uid, event.workflow, true);

    if (Object.keys(updatedStatus.activities[activity].async.mandatory).length === 0) {
        console.log('No plugins registered, performing update to move task forward');
        await statusDal.updateStageStatus(
            event.uid, event.workflow, activity, OrchestratorStage.BulkProcessing,
            OrchestratorComponentState.Complete, ' ', startTime, ' ');

        try {
            await stepfunctions.sendTaskSuccess({
                output: JSON.stringify(OrchestratorComponentState.Complete),
                taskToken: asyncEvent.asyncToken
            }).promise();
        } catch (err) {
            if (err.message !== "Task Timed Out: 'Provided task does not exist anymore'") {
                throw err;
            }
        }
    }

    return OrchestratorComponentState.InProgress;
});

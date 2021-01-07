/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import {
    stepLambdaAsyncWrapper, OrchestratorWorkflowStatus,
    OrchestratorStatusDal, OrchestratorStage, OrchestratorComponentState,
    OrchestratorPluginDal, OrchestratorStatus, OrchestratorSyncPlugin
}
    from '@moe-tech/orchestrator';
import { Lambda } from 'aws-sdk';

const activity: string = process.env.activity;
const statusDal: OrchestratorStatusDal = new OrchestratorStatusDal();
const pluginDal: OrchestratorPluginDal = new OrchestratorPluginDal(process.env.pluginTable, activity);
const stage = (process.env.stage === 'pre') ? OrchestratorStage.PreProcessing : OrchestratorStage.PostProcessing;
const lambda = new Lambda();

function getPluginStatus (overallStatus: OrchestratorWorkflowStatus,
    plugin: OrchestratorSyncPlugin) : OrchestratorStatus {
    if (overallStatus.activities &&
        overallStatus.activities[activity] &&
        overallStatus.activities[activity][stage] &&
        overallStatus.activities[activity][stage][plugin.mandatory ? 'mandatory' : 'optional'] &&
        overallStatus.activities[activity][stage][plugin.mandatory ? 'mandatory' : 'optional'][plugin.pluginName]) {
        return overallStatus.activities[activity][stage][plugin.mandatory ? 'mandatory' : 'optional'][plugin.pluginName];
    }
    return {} as OrchestratorStatus;
}

export const start = stepLambdaAsyncWrapper(async (event: OrchestratorWorkflowStatus) => {
    console.log(JSON.stringify(event));
    if (!event) {
        throw new Error('Event data unexpected');
    }
    if (!event.workflow) {
        throw new Error(`Event data unexpected (workflow: '${event.workflow}')`);
    }
    if (!event.uid) {
        throw new Error(`Event data unexpected (uid: '${event.uid}')`);
    }

    console.log('Setting stage status to InProgress');
    await statusDal.updateStageStatus(event.uid, event.workflow, activity, stage,
        OrchestratorComponentState.InProgress, ' ');

    console.log('Retrieving registered plugins');
    const plugins = await pluginDal.getPlugins(stage);
    if (!plugins || plugins.length === 0) {
        await statusDal.updateStageStatus(event.uid, event.workflow, activity, stage,
            OrchestratorComponentState.Complete, ' ');
        return;
    }

    console.log(`Retrieved plugins (${plugins ? plugins.length : 0})`);

    console.log('Retrieving status object');
    let overallStatus = await statusDal.getStatusObject(event.uid, event.metadata.workflow);
    const stageStatus = overallStatus.activities[activity][stage];

    //
    // Register plugins as not started
    //
    await Promise.all(plugins.map(item => {
        if (getPluginStatus(overallStatus, item).state !== OrchestratorComponentState.Complete) {
            return statusDal.updatePluginStatus(
                event.uid, event.workflow,
                activity, stage, item.mandatory, item.pluginName,
                OrchestratorComponentState.NotStarted, ' ');
        }
    }));

    //
    // Execute all
    //
    overallStatus = await statusDal.getStatusObject(event.uid, event.metadata.workflow);

    if (!overallStatus) {
        throw new Error('The status object cannot be found');
    }

    if (!overallStatus.activities[activity]) {
        throw new Error('The orchistration id has not been provisioned');
    }
    const statusObject = {};
    statusObject[activity] = overallStatus.activities[activity];

    const globalMetadata = {
        now: new Date().getTime(),
        ...event.metadata,
        uid: event.uid
    } as any;
    const message = {
        orchestratorId: process.env.orchestratorId,
        status: overallStatus.status,
        activity,
        activities: statusObject,
        stage,
        ...globalMetadata
    };
    const snsMessage = {
        Records: [{
            Sns: {
                Message: JSON.stringify(message)
            }
        }]
    };
    for (const i in plugins) {
        const plugin = plugins[i];
        if (!plugin) {
            continue;
        }
        if (!plugin.functionName) {
            throw new Error(`Plugin does not have required values ${JSON.stringify(plugin)}`);
        }

        console.log('Calling plugin ' + plugin.functionName);
        if (process.env.debugInput === 'true') {
            console.log(JSON.stringify(snsMessage));
        }

        let retryCount = -1;
        let error = null;
        do {
            error = null;
            retryCount++;
            try {
                const status = getPluginStatus(overallStatus, plugin);
                if (status.state !== OrchestratorComponentState.Complete) {
                    const resultPromise = lambda.invoke({
                        FunctionName: plugin.functionName,
                        Payload: JSON.stringify(snsMessage)
                    });
                    const result = await resultPromise.promise();

                    if (result.FunctionError) {
                        throw new Error(result.FunctionError as string);
                    } else if ((result.Payload && result.Payload.toString().match(/Error:.+/))) {
                        throw new Error(result.Payload.toString());
                    }
                }
            } catch (err) {
                error = err;
                if (process.env.unittest !== 'true') {
                    await new Promise<void>((resolve) => {
                        setTimeout(
                            () => {
                                resolve();
                            },
                            1000);
                    });
                }
            }
        } while (error != null && retryCount < 3);
        if (error) {
            await statusDal.updatePluginStatus(
                event.uid, event.workflow, activity, stage,
                plugin.mandatory, plugin.pluginName,
                OrchestratorComponentState.Error,
                error.message);
            await statusDal.updateStageStatus(
                event.uid, event.workflow, activity, stage,
                OrchestratorComponentState.Error, error.message);
            throw error;
        }
        console.log('Completed plugin ' + plugin.functionName);
    }
    console.log('Getting plugin status');
    let status = await statusDal.getStatusObject(event.uid, event.workflow);
    // if we are in error.. throw.. we are done
    if (status.activities[activity][stage].status.state === OrchestratorComponentState.Error) {
        throw new Error('The status of the stage does not comply with moving to next stage ' +
        status.activities[activity][stage].status.state);
    }
    if (status.activities[activity][stage].status.state === OrchestratorComponentState.InProgress) {
        // we are still in progress so retry up to 3 times
        let statusRetryCount = -1;
        let statusError = null;
        do {
            statusError = null;
            statusRetryCount++;
            try {
                status = await statusDal.getStatusObject(event.uid, event.workflow);
            } catch (err) {
                statusError = err;
                await new Promise<void>((resolve) => {
                    setTimeout(
                        () => {
                            resolve();
                        },
                        1000);
                });
            }
        } while (statusError != null && statusRetryCount < 3);
        if (statusError) {
            throw new Error('The status of the stage does not comply with moving to next stage ' +
        status.activities[activity][stage].status.state);
        }
    }

    return {};
});

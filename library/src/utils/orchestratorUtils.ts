import {
    OrchestratorComponentState,
    OrchestratorPluginMessage, PluginInfo, OrchestratorWorkflowStatus, OrchestratorConfig
} from '../types';

import {
    OrchestratorStatusDal
} from '../dataAccessLayers/orchestratorStatusDal';
import { lambdaWrapperAsync, registerObservableError, setLabel } from './tracingUtils';
import { SNSEvent, SNSEventRecord } from 'aws-lambda';
import { SQS } from 'aws-sdk';

let messageHandler = null;
let pluginInformation: PluginInfo;
let oasdOverride: OrchestratorStatusDal = null;
let sqs: SQS = null;

export function setOASDOverride (value: OrchestratorStatusDal) {
    oasdOverride = value;
}

export function setSqsOverride (value: SQS) {
    sqs = value;
}

/**
 * Wrap your method to tie into the orchestator and optionally get and/or save PolicyData array.
 *
 * @param {PluginInfo} pluginInfo use to set name and if you want the wrapper
 *  to provide PolicyData and save the PolicyData
 * @param {*} method method you are wrapping
 * @returns PolicyData array if you chose getOnly or getAndSave in PluginInfo PluginInfoDataAction
 */
export const orchestratorWrapperSns = (pluginInfo: PluginInfo, method) => {
    messageHandler = method;
    pluginInformation = pluginInfo;
    return lambdaWrapperAsync(ProcessSNSEvent);
};

export function orchestratorWrapperSqs (pluginInfo: PluginInfo, method) {
    messageHandler = method;
    pluginInformation = pluginInfo;
    return lambdaWrapperAsync(ProcessSqsEvent);
}

async function ProcessSNSEvent (snsEvent) {
    const promises = [];
    if (process.env.debugInput === 'true') {
        console.log(JSON.stringify(snsEvent));
    }

    for (const event of snsEvent.Records) {
        const message = JSON.parse(event.Sns.Message);
        promises.push(ProcessMessage(message, pluginInformation));
    }

    await Promise.all(promises);

    if (promises.length === 1) {
        return await promises[0];
    }
}

async function ProcessSqsEvent (sqsEvent) {
    if (process.env.debugInput === 'true') {
        console.log(JSON.stringify(sqsEvent));
    }
    const promises = [];
    for (const event of sqsEvent.Records) {
        let message: any = null;
        if (event.Sqs && event.Sqs.Message) {
            message = JSON.parse(event.Sqs.Message);
        } else if (event.body) {
            message = JSON.parse(event.body);
        } else {
            console.log(JSON.stringify(sqsEvent));
            throw new Error('The message recieved cannot be handled');
        }

        promises.push(ProcessMessage(message, pluginInformation));
    }

    await Promise.all(promises);
}

function isComplete (
    currentStatus: OrchestratorWorkflowStatus,
    message: OrchestratorPluginMessage,
    required: string,
    pluginInfo: PluginInfo) {
    if (!currentStatus || !currentStatus.activities ||
        !currentStatus.activities[message.activity]) {
        return false;
    }
    const activity = currentStatus.activities[message.activity];

    if (activity[message.stage] &&
        activity[message.stage][required] &&
        activity[message.stage][required][pluginInfo.pluginName] &&
        activity[message.stage][required][pluginInfo.pluginName].state === OrchestratorComponentState.Complete) {
        return true;
    }

    if (activity[message.stage] &&
        activity[message.stage][required] &&
        activity[message.stage][required][pluginInfo.pluginName] &&
        activity[message.stage][required][pluginInfo.pluginName].state === OrchestratorComponentState.DoNotRun) {
        return true;
    }

    return false;
}

async function ProcessMessage (message: OrchestratorPluginMessage, pluginInfo: PluginInfo) {
    if (message.initialize) {
        return pluginInfo;
    }
    if (!message || !message.uid || !message.workflow || !message.activity) {
        console.log('Invalid message, orchistrator wrapper ignoring it', message);
        return 'Error: Invalid message, orchistrator wrapper ignoring it';
    }

    const oasd = (oasdOverride) || new OrchestratorStatusDal();
    let mandatory = pluginInfo.default.mandatory;
    const override = (pluginInfo.overrides) ? pluginInfo.overrides[message.activity] : null;
    if (override && override.mandatory !== undefined) {
        mandatory = override.mandatory;
    }
    if (!pluginInfo.alwaysRun) {
        const required = mandatory ? 'mandatory' : 'optional';
        if (isComplete(message, message, required, pluginInfo)) {
            return;
        }
        if (pluginInfo.idempotent || pluginInfo.idempotent === undefined) {
            const currentStatus = await oasd.getStatusObject(message.uid, message.workflow);
            if (isComplete(currentStatus, message, required, pluginInfo)) {
                return;
            }
        }
    }
    // log status as InProgress into the nucleus-orchestrator-core-{stage}-status table
    const inProgressStatusUpdate = oasd.updatePluginStatus(
        message.uid, message.workflow, message.activity,
        message.stage, mandatory, pluginInfo.pluginName,
        OrchestratorComponentState.InProgress, '');

    setLabel('uid', message.uid);
    setLabel('workflow', message.workflow);
    setLabel('activity', message.activity);

    try {
        await messageHandler(message);
    } catch (err) {
    // log error into the nucleus-orchestrator-core-{stage}-status table
        if (err.setStatus) {
            await inProgressStatusUpdate;
            await oasd.updatePluginStatus(
                message.uid, message.workflow, message.activity,
                message.stage, mandatory, pluginInfo.pluginName,
                OrchestratorComponentState.Error, err.message || err);

            registerObservableError(err);
            console.log(err.message || err);
            return 'Error: ' + (err.message || err);
        } else {
            console.log(typeof err);
            console.log(JSON.stringify(err));
            throw err;
        }
    }

    await inProgressStatusUpdate;
    // log status as Complete into the nucleus-orchestrator-core-{stage}-status table

    await oasd.updatePluginStatus(
        message.uid, message.workflow, message.activity,
        message.stage, mandatory, pluginInfo.pluginName,
        OrchestratorComponentState.Complete, '');
}

export function getOrchestratorSqsPassthrough (pluginInfo: PluginInfo, sqsUrl: string) {
    return lambdaWrapperAsync(async (event: SNSEvent) => {
        if (event.Records.length === 1) {
            const message = JSON.parse(event.Records[0].Sns.Message) as OrchestratorPluginMessage;
            if (message.initialize) {
                return pluginInfo;
            }
        }

        await Promise.all(event.Records.map(r => orchestratorSqsEnqueueRecord(r, pluginInfo, sqsUrl)));
    });
}

async function orchestratorSqsEnqueueRecord (record: SNSEventRecord, pluginInfo: PluginInfo, sqsUrl) {
    const message = JSON.parse(record.Sns.Message) as OrchestratorPluginMessage;
    const oasd = (oasdOverride) || new OrchestratorStatusDal();
    if (!sqs) { sqs = new SQS(); }

    const mandatory = pluginInfo.default.mandatory;

    if (!pluginInfo.alwaysRun) {
        const required = mandatory ? 'mandatory' : 'optional';
        if (isComplete(message, message, required, pluginInfo)) {
            return;
        }
        if (pluginInfo.idempotent || pluginInfo.idempotent === undefined) {
            const currentStatus = await oasd.getStatusObject(message.uid, message.workflow);
            if (isComplete(currentStatus, message, required, pluginInfo)) {
                return;
            }
        }
    }

    await oasd.updatePluginStatus(
        message.uid, message.workflow, message.activity,
        message.stage, mandatory,
        pluginInfo.pluginName,
        OrchestratorComponentState.InProgress, '');

    const params: SQS.SendMessageRequest = {
        QueueUrl: sqsUrl,
        MessageBody: JSON.stringify(message)
    };

    if (sqsUrl.toLowerCase().endsWith('.fifo')) {
        params.MessageGroupId = pluginInfo?.fifoKey || message.uid;
        console.log(params.MessageGroupId);
    }

    await sqs.sendMessage(params).promise();
}

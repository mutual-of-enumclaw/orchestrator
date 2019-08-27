import * as AWS from 'aws-sdk';
import { OrchestratorStatusDal, OrchestratorComponentState, 
         OrchestratorPluginMessage, PluginInfo } from '..';
import { lambdaWrapperAsync, registerObservableError, setLabel } from './epsagonUtils';

let messageHandler = null;
let pluginInformation: PluginInfo;
let oasdOverride: OrchestratorStatusDal = null;

export function setOASDOverride(value: OrchestratorStatusDal) {
    oasdOverride = value;
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

export function orchestratorWrapperSqs(pluginInfo: PluginInfo, method) {
    messageHandler = method;
    pluginInformation = pluginInfo;
    return lambdaWrapperAsync(ProcessSqsEvent);
}

async function ProcessSNSEvent(snsEvent) {
    const promises = [];
    if (process.env.debugInput === 'true') {
        console.log(JSON.stringify(snsEvent));
    }

    for(const event of snsEvent.Records) {
        const message = JSON.parse(event.Sns.Message);
        promises.push(ProcessMessage(message, pluginInformation));
    }

    await Promise.all(promises);
    
    if(promises.length === 1) {
        return await promises[0];
    }
}

async function ProcessSqsEvent(sqsEvent) {
    if (process.env.debugInput === 'true') {
        console.log(JSON.stringify(sqsEvent));
    }
    const promises = [];
    for(const event of sqsEvent.Records) {
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

async function ProcessMessage(message: OrchestratorPluginMessage, pluginInfo: PluginInfo) {
    if(message.initialize) {
        return pluginInfo;
    }
    if(!message || !message.uid || !message.workflow || !message.activity) {
        console.log('Invalid message, orchistrator wrapper ignoring it', message);
        return;
    }

    const oasd = (oasdOverride) ? 
        oasdOverride : new OrchestratorStatusDal(process.env.orchestratorStatusTable, message.activity);
    let mandatory = pluginInfo.default.mandatory;
    const override = (pluginInfo.overrides)? pluginInfo.overrides[message.activity] : null;
    if (override && override.mandatory !== undefined) {
        mandatory = override.mandatory;
    }
    if(!pluginInfo.alwaysRun) {
        const currentStatus = await oasd.getStatusObject(message.uid, message.workflow);
        const required = mandatory ? 'mandatory' : 'optional';
        if(currentStatus 
            && currentStatus.activities 
            && currentStatus.activities[message.activity]
            && currentStatus.activities[message.activity][message.stage]
            && currentStatus.activities[message.activity][message.stage][required]
            && currentStatus.activities[message.activity][message.stage][required]
            && currentStatus.activities[message.activity][message.stage][required][pluginInfo.pluginName]
            && currentStatus.activities[message.activity][message.stage][required][pluginInfo.pluginName].state
             === OrchestratorComponentState.Complete) {
                return;
            }
    }
    // log status as InProgress into the nucleus-orchestrator-core-{stage}-status table
    const inProgressStatusUpdate = oasd.updatePluginStatus(
        message.uid, message.workflow, message.activity,
        message.stage, mandatory, pluginInfo.pluginName,
        OrchestratorComponentState.InProgress, "");

    setLabel('uid', message.uid);
    setLabel('workflow', message.workflow);
    setLabel('activity', message.activity);

    try {
        await messageHandler(message);
    }
    catch (err) {
        // log error into the nucleus-orchestrator-core-{stage}-status table
        if (err.setStatus) {
            await inProgressStatusUpdate;
            await oasd.updatePluginStatus(
                message.uid, message.workflow, message.activity,
                message.stage, mandatory, pluginInfo.pluginName,
                OrchestratorComponentState.Error, err.message || err);

            registerObservableError(err);
            console.log(err.message || err);
            return;
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
        OrchestratorComponentState.Complete, "");
}

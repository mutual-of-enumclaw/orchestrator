import { OrchestratorWorkflowStatus } from '../types';

export * from './epsagonUtils';
export * from './orchestratorUtils';

const DEFAULT_PLUGIN_REGISTER_TIMEOUT = 5000;

export function getPluginRegisterTimeout(workflow: OrchestratorWorkflowStatus, activity: string) {
    if(!workflow) {
        return DEFAULT_PLUGIN_REGISTER_TIMEOUT;
    }

    if(activity && workflow.activities[activity] && workflow.activities[activity].pluginRegisterTimeout) {
        return workflow.activities[activity].pluginRegisterTimeout;
    }
    if(workflow.pluginRegisterTimeout) {
        return workflow.pluginRegisterTimeout;
    }

    return DEFAULT_PLUGIN_REGISTER_TIMEOUT;
}

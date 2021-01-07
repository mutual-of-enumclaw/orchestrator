import { OrchestratorSyncPlugin, OrchestratorWorkflowStatus } from '../types';

export const DEFAULT_PLUGIN_REGISTER_TIMEOUT = 5000;

export function getPluginRegisterTimeout (workflow: OrchestratorWorkflowStatus,
    activity: string,
    plugins?: OrchestratorSyncPlugin[]) {
    if (!workflow) {
        return DEFAULT_PLUGIN_REGISTER_TIMEOUT;
    }

    let defaultTimeout = DEFAULT_PLUGIN_REGISTER_TIMEOUT;
    if (plugins) {
        const optional = plugins.filter(x => !x.mandatory);
        if (optional && optional.length > 0) {
            optional.sort((a, b) => {
                if (!a.pluginRegisterTimeout) {
                    a.pluginRegisterTimeout = DEFAULT_PLUGIN_REGISTER_TIMEOUT;
                }
                if (!b.pluginRegisterTimeout) {
                    b.pluginRegisterTimeout = DEFAULT_PLUGIN_REGISTER_TIMEOUT;
                }
                return b.pluginRegisterTimeout - a.pluginRegisterTimeout;
            });

            defaultTimeout = optional[0].pluginRegisterTimeout;
        } else {
            defaultTimeout = 0;
        }
    }

    if (activity && workflow.activities[activity] && workflow.activities[activity].pluginRegisterTimeout) {
        if (defaultTimeout < workflow.activities[activity].pluginRegisterTimeout) {
            defaultTimeout = workflow.activities[activity].pluginRegisterTimeout;
        }
    } else if (workflow.pluginRegisterTimeout) {
        if (defaultTimeout < workflow.pluginRegisterTimeout) {
            defaultTimeout = workflow.pluginRegisterTimeout;
        }
    }

    return defaultTimeout;
}

import { MockPluginManagementDal } from '@moe-tech/orchestrator/__mock__/dals';
import { PluginStorageDefinition, PluginManagementDal } from '@moe-tech/orchestrator';

import { handler } from './pluginUpdate';

process.env.pluginTable = 'nk-orch-snd-plugin';
process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
process.env.activity = 'Step2';

const pluginManager = new MockPluginManagementDal(PluginManagementDal);

describe('pluginUpdate', () => {
    beforeEach(() => {
        pluginManager.reset();
    });
    test('Ensure only stored functions are updated', async () => {
        let updateComplete = false;
        pluginManager.getPluginByFunction.mockResolvedValueOnce([{
            orchestratorId: 'Stage2|pre',
            pluginName: 'Pre Plugin',
            functionName: 'orch-plugin-pre-post-prePlugin',
            subscriptionArn: 'arn:subscription'
        } as PluginStorageDefinition]);

        pluginManager.getPluginConfig.mockImplementation((plugin) => {
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    updateComplete = true;
                    resolve(plugin);
                }, 500);
            });
        });
        await handler({
            detail: {
                responseElements: {
                    functionName: 'orch-plugin-pre-post-prePlugin'
                }
            }
        });

        expect(updateComplete).toBe(true);
        expect(pluginManager.getPluginByFunction).toBeCalledTimes(1);
        expect(pluginManager.getPluginConfig).toBeCalledTimes(1);
        expect(pluginManager.addPlugin).toBeCalledTimes(1);
    });

    test('Update ensure promises are respected', async () => {
        let updateComplete = false;
        pluginManager.getPluginByFunction.mockResolvedValueOnce([{
            orchestratorId: 'Stage2|pre',
            pluginName: 'Pre Plugin',
            functionName: 'orch-plugin-pre-post-prePlugin',
            subscriptionArn: 'arn:subscription'
        } as PluginStorageDefinition]);

        pluginManager.getPluginConfig.mockImplementation((plugin) => {
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    updateComplete = true;
                    resolve(plugin);
                }, 500);
            });
        });
        await handler({
            detail: {
                responseElements: {
                    functionName: 'orch-plugin-pre-post-prePlugin'
                }
            }
        });

        expect(updateComplete).toBe(true);
        expect(pluginManager.addPlugin).toBeCalledTimes(1);
    });
});

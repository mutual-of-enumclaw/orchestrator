process.env.pluginTable = 'nk-orch-snd-plugin';
process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
process.env.activity = 'Step2';

import { MockPluginManager } from './mockPluginManager.spec';
import { PluginManager, PluginManagementDal, PluginStorageDefinition } from '@moe-tech/orchestrator';

const pluginManager = new MockPluginManager(PluginManager, PluginManagementDal);

import { handler } from './pluginUpdate';

describe('pluginUpdate', ()=> {
    beforeEach(() => {
        pluginManager.reset();
    });
    test('Ensure only stored functions are updated', async () => {
        let updateComplete = false;
        pluginManager.getPlugin.mockResolvedValueOnce({
            orchestratorId: 'Stage2|pre',
            pluginName: 'Pre Plugin',
            functionName: 'orch-plugin-pre-post-prePlugin',
            subscriptionArn: 'arn:subscription'
        } as PluginStorageDefinition);

        pluginManager.updateLambdaParams.mockImplementation(() => {
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    updateComplete = true;
                    resolve();
                }, 500);
            });
        });
        await handler({
            "detail": {
              "responseElements": {
                "functionName": "orch-plugin-pre-post-prePlugin",
              }
            }
          });

          expect(updateComplete).toBe(true);
          expect(pluginManager.getPlugin).toBeCalledTimes(3);
          expect(pluginManager.updateLambdaParams).toBeCalledTimes(1);
    });

    test('Update ensure promises are respected', async () => {
        let updateComplete = false;
        pluginManager.getPlugin.mockImplementation(() => {
            return {
                orchestratorId: 'Stage2|pre',
                pluginName: 'Pre Plugin',
                functionName: 'orch-plugin-pre-post-prePlugin',
                subscriptionArn: 'arn:subscription'
            } as PluginStorageDefinition
        });

        pluginManager.updateLambdaParams.mockImplementation(() => {
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    updateComplete = true;
                    resolve();
                }, 500);
            });
        });
        await handler({
            "detail": {
              "responseElements": {
                "functionName": "orch-plugin-pre-post-prePlugin",
              }
            }
          });

          expect(updateComplete).toBe(true);
          expect(pluginManager.updateLambdaParams).toBeCalledWith('orch-plugin-pre-post-prePlugin', 'arn:subscription', 'pre');
          expect(pluginManager.updateLambdaParams).toBeCalledWith('orch-plugin-pre-post-prePlugin', 'arn:subscription', 'post');
          expect(pluginManager.updateLambdaParams).toBeCalledWith('orch-plugin-pre-post-prePlugin', 'arn:subscription', 'async');
    });
});
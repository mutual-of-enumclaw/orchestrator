/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { PluginManagementDal } from '@moe-tech/orchestrator';
import { MockPluginManagementDal } from '@moe-tech/orchestrator/__mock__/dals';
import { handler } from './pluginRemove';
process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
process.env.parallelArn = 'arn:aws:sns:1:us-west-2:snsTopicParallel';
process.env.preArn = 'arn:aws:sns:1:us-west-2:snsTopicPre';
process.env.postArn = 'arn:aws:sns:1:us-west-2:snsTopicPost';

const pluginManager = new MockPluginManagementDal(PluginManagementDal);

console.log = () => {};

describe('processCloudwatchEvent', () => {
    beforeEach(() => {
        pluginManager.reset();
    });
    test('Invalid Event', async () => {
        let error = null;
        try {
            await handler(null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Argument event not valid');
    });

    test('Remove pre', async () => {
        pluginManager.getPluginBySubscription.mockResolvedValueOnce({
            subscriptionArn: process.env.preArn,
            orchestratorId: 'activity|pre'
        });
        await handler({
            detail: {
                eventName: 'Unsubscribe',
                requestParameters: {
                    subscriptionArn: process.env.preArn
                }
            }
        });

        expect(pluginManager.removePlugin).toBeCalledWith('activity', 'pre', process.env.preArn);
    });
    test('Remove parallel', async () => {
        pluginManager.getPluginBySubscription.mockResolvedValueOnce({
            subscriptionArn: process.env.parallelArn,
            orchestratorId: 'activity|async'
        });
        await handler({
            detail: {
                eventName: 'Unsubscribe',
                requestParameters: {
                    subscriptionArn: process.env.parallelArn
                }
            }
        });
        expect(pluginManager.removePlugin).toBeCalledWith('activity', 'async', process.env.parallelArn);
    });
    test('Remove post', async () => {
        pluginManager.getPluginBySubscription.mockResolvedValueOnce({
            subscriptionArn: process.env.postArn,
            orchestratorId: 'activity|post'
        });
        await handler({
            detail: {
                eventName: 'Unsubscribe',
                requestParameters: {
                    subscriptionArn: process.env.postArn
                }
            }
        });
        expect(pluginManager.removePlugin).toBeCalledWith('activity', 'post', process.env.postArn);
    });
});

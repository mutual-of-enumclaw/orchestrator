/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
process.env.parallelArn = 'arn:aws:sns:1:us-west-2:snsTopicParallel';
process.env.preArn = 'arn:aws:sns:1:us-west-2:snsTopicPre';
process.env.postArn = 'arn:aws:sns:1:us-west-2:snsTopicPost';
import { MockPluginManager } from './mockPluginManager.spec';
import { PluginManager, PluginManagementDal } from '@moe-tech/orchestrator';

const pluginManager = new MockPluginManager(PluginManager, PluginManagementDal);

import { handler } from './pluginRemove';

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
        await handler({
            detail: {
                requestParameters: {
                    topicArn: process.env.preArn
                }
            }
        });
    });
    test('Remove parallel', async () => {
        await handler({
            detail: {
                requestParameters: {
                    topicArn: process.env.parallelArn
                }
            }
        });
    });
    test('Remove post', async () => {
        await handler({
            detail: {
                requestParameters: {
                    topicArn: process.env.postArn
                }
            }
        });
    });
});

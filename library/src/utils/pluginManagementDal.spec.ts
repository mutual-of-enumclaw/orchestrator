/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { MockDynamoDb } from '../__mock__/aws';
const dynamoDb = new MockDynamoDb();

import { PluginManagementDal } from './pluginManagementDal';

const dal = new PluginManagementDal('Test', 'orchId', 'stageName');

describe('addPlugin', () => {
    test('Basic add', async () => {
        dynamoDb.reset();
        await dal.addPlugin('arn:subscription', { functionName: 'lambda name', order: 1 } as any );

        expect(dynamoDb.putInput.Item.orchestratorId).toBe('orchId|stageName');
        expect(dynamoDb.putInput.Item.subscriptionArn).toBe('arn:subscription');
    });
});

describe('delete', () => {
    test('Basic delete', async () => {
        dynamoDb.reset();
        await dal.removePlugin('subscription');

        expect(dynamoDb.deleteInput.Key.orchestratorId).toBe('orchId|stageName');
        expect(dynamoDb.deleteInput.Key.subscriptionArn).toBe('subscription');
    });
});

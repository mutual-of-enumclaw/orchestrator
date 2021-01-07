/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { DynamoDB } from 'aws-sdk';
import { MockDynamoDb } from '../__mock__/aws';

import { PluginManagementDal } from './pluginManagementDal';
const dynamoDb = new MockDynamoDb(DynamoDB.DocumentClient);

const dal = new PluginManagementDal('Test');
const activity = 'orchId';
const stage = 'stageName';

describe('addPlugin', () => {
    test('Basic add', async () => {
        dynamoDb.reset();
        await dal.addPlugin(activity, stage, 'arn:subscription', { functionName: 'lambda name', order: 1 } as any);

        expect(dynamoDb.putInput.Item.orchestratorId).toBe('orchId|stageName');
        expect(dynamoDb.putInput.Item.subscriptionArn).toBe('arn:subscription');
    });
});

describe('delete', () => {
    test('Basic delete', async () => {
        dynamoDb.reset();
        await dal.removePlugin(activity, stage, 'subscription');

        expect(dynamoDb.deleteInput.Key.orchestratorId).toBe('orchId|stageName');
        expect(dynamoDb.deleteInput.Key.subscriptionArn).toBe('subscription');
    });
});

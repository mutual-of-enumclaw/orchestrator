/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { DynamoDB } from 'aws-sdk';
import { OrchestratorStage } from '../types';
import { MockDynamoDb } from '../__mock__/aws';

import { OrchestratorPluginDal } from './orchestratorPluginDal';

const mockDb = new MockDynamoDb(DynamoDB.DocumentClient);
const dal = new OrchestratorPluginDal('Test', 'Orch');

describe('getSyncPlugins', () => {
    beforeEach(() => {
        mockDb.reset();
    });
    test('stage not defined', async () => {
        let error = null;
        try {
            await dal.getPlugins(null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Argument stage not defined');
    });
    test('dynamodb null', async () => {
        mockDb.queryReturn = null;
        const result = await dal.getPlugins(OrchestratorStage.PreProcessing);
        expect(result).toMatchObject([]);
    });

    test('dynamodb empty', async () => {
        mockDb.queryReturn = [];
        const result = await dal.getPlugins(OrchestratorStage.PostProcessing);
        expect(result).toMatchObject([]);
    });

    test('dynamodb out of order', async () => {
        mockDb.queryReturn = [
            {
                arn: 'test 2',
                order: 2
            },
            {
                arn: 'test 1',
                order: 1
            }
        ];
        const result = await dal.getPlugins(OrchestratorStage.PreProcessing);
        expect(result).toBeDefined();
        expect(result).toMatchObject([
            {
                arn: 'test 1',
                order: 1
            },
            {
                arn: 'test 2',
                order: 2
            }
        ]);
    });
});

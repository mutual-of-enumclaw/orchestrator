/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { OrchestratorStatusDal } from './orchestratorStatusDal';
import { OrchestratorComponentState, OrchestratorStage } from '../types';
import { MockDynamoDb } from '../../../__mock__/mockDynamoDb';

const mockDb = new MockDynamoDb();

describe('getStatusObject', () => {
    const dal = new OrchestratorStatusDal('Test');
    (dal as any).dal = mockDb;

    test('Empty id', async () => {
        let error = null;
        try {
            await dal.getStatusObject('', 'test');
        } catch(err) {
            error = err.message;
        }

        expect(error).toBe('No id specified');
    });
    test('Empty activity', async () => {
        let error = null;
        try {
            await dal.getStatusObject('Test', '');
        } catch(err) {
            error = err.message;
        }

        expect(error).toBe('No activity specified');
    });

    test('Valid id', async () => {
        await dal.getStatusObject('Test', 'test');
    });
});


describe('updateStageStatus', () => {
    const dal = new OrchestratorStatusDal('Test');
    (dal as any).dal = mockDb;
    test('null values', async () => {
        mockDb.reset();
        await dal.updateStageStatus('', '', '', null, null, '');
        expect(mockDb.updateInput).toBeDefined();
    });

    test('valid values', async () => {
        await dal.updateStageStatus('test', 'test', 'test', OrchestratorStage.PreProcessing, 
                                    OrchestratorComponentState.Complete, 'test');
        expect(mockDb.updateInput).toBeDefined();
    });
});

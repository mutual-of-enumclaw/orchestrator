/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { OrchestratorStatusDal } from './orchestratorStatusDal';
import { OrchestratorComponentState, OrchestratorStage } from '..';
import { MockDynamoDb } from '../../__mock__/mockDynamoDb';

const mockDb = new MockDynamoDb();

describe('getStatusObject', () => {
    const dal = new OrchestratorStatusDal('Test', 'Orch');
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

    test('returns undefined when no valueFound', async () => {
        mockDb.reset();
        const ret = await dal.getStatusObject('Test', 'test');
        expect(ret).toBeUndefined();
    });
    test('returns undefined when value is found but no items', async () => {
        mockDb.reset();
        mockDb.returnObject = undefined;
        const ret = await dal.getStatusObject('Test', 'test');
        expect(ret).toBeUndefined();
    });
});


describe('updateStageStatus', () => {
    const dal = new OrchestratorStatusDal('Test', 'Orch');
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

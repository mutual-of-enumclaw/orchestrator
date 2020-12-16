/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { OrchestratorComponentState, OrchestratorStage } from '../types';
import { MockDynamoDb } from '../__mock__/aws';
const mockDb = new MockDynamoDb();

import { OrchestratorStatusDal } from './orchestratorStatusDal';

describe('getStatusObject', () => {
  const dal = new OrchestratorStatusDal('Test');

  beforeEach(() => {
    mockDb.reset();
  });

  test('Empty id', async () => {
    let error = null;
    try {
      await dal.getStatusObject('', 'test');
    } catch (err) {
      error = err.message;
    }

    expect(error).toBe('No id specified');
  });
  test('Empty activity', async () => {
    let error = null;
    try {
      await dal.getStatusObject('Test', '');
    } catch (err) {
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
  beforeEach(() => {
    mockDb.reset();
  });

  test('null values', async () => {
    mockDb.reset();
    await dal.updateStageStatus('', '', '', null, null, '');
    expect(mockDb.update).toBeCalled();
  });

  test('valid values', async () => {
    await dal.updateStageStatus('test', 'test', 'test', OrchestratorStage.PreProcessing,
      OrchestratorComponentState.Complete, 'test');
    expect(mockDb.update).toBeCalled();
  });
});

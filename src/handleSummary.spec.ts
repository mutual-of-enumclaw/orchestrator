/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { updateActivityStatus, validateActivity, StatusSummary, setServices } from './handleSummary';
import { MockDynamoDb } from '../__mock__/mockDynamoDb';
import { OrchestratorComponentState, OrchestratorActivityStatus } from '@moe-tech/orchestrator';
import { OrchestratorPluginDal, OrchestratorStatusDal } from '../__mock__/libServices';

class MockStepFunctions {
    sendTaskSuccess = jest.fn();
    sendTaskFailure = jest.fn();

    reset () {
      this.sendTaskFailure.mockReset();
      this.sendTaskFailure.mockImplementation(() => {
        return {
          promise: async () => {}
        };
      });
      this.sendTaskSuccess.mockReset();
      this.sendTaskSuccess.mockImplementation(() => {
        return {
          promise: async () => {}
        };
      });
    }
}
console.log = () => { };

describe('updateActivityStatus', () => {
  process.env.environment = 'unit-test';
  const dynamoDal = new MockDynamoDb();
  const stepFunctions = new MockStepFunctions();
  const pluginDal = new OrchestratorPluginDal();
  const statusDal = new OrchestratorStatusDal();
  beforeEach(() => {
    setServices(stepFunctions, dynamoDal, pluginDal, statusDal);
    stepFunctions.reset();
    dynamoDal.reset();
    pluginDal.reset();
    statusDal.reset();
  });

  test('Null Event', async () => {
    await updateActivityStatus(null);
  });

  test('Undefinfed Records', async () => {
    await updateActivityStatus({});
  });

  test('Empty Records', async () => {
    await updateActivityStatus({ Records: [] });
  });

  test('Empty Record', async () => {
    let error = null;
    try {
      await updateActivityStatus({ Records: [{}] });
    } catch (err) {
      error = err.message;
    }
    expect(error).toBe("Cannot read property 'NewImage' of undefined");
  });

  test('Basic - no change to status', async () => {
    await updateActivityStatus(createBasicEvent());
    expect(dynamoDal.updateInput).toBeNull();
  });

  describe('deDupe', () => {
    test('remove dupes', async () => {
      const event = {
        Records: [
          createBasicRecord(),
          createBasicRecord()
        ]
      };
      const record1 = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory;
      record1.M.test.M.state.S = OrchestratorComponentState.NotStarted;
      const record2 = event.Records[1].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory;
      record2.M.test.M.state.S = OrchestratorComponentState.Complete;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInputs).toHaveLength(1);
      expect(dynamoDal.updateInputs[0].UpdateExpression).toContain('#Rate.#pre.#status.#state = :Rateprestate');
      expect(dynamoDal.updateInputs[0].ExpressionAttributeValues[':Rateprestate'])
        .toBe(OrchestratorComponentState.Complete);
      expect(dynamoDal.updateInputs[0].ExpressionAttributeNames['#pre']).toBe('pre');
    });
  });

  describe('async', () => {
    test('Basic - async not started', async () => {
      const event = createBasicEvent();
      const status = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.status;
      status.M.state.S = OrchestratorComponentState.NotStarted;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory.M = {};
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeNull();
    });

    test('Basic - single item null', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory.M.test.NULL = true;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeNull();
    });

    test('Basic - single item complete status change', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain('#Rate.#async.#status.#state = :Rateasyncstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateasyncstate'])
        .toBe(OrchestratorComponentState.Complete);

      expect(dynamoDal.updateInput.ExpressionAttributeNames['#async']).toBe('async');
    });

    test('Basic - multiple items mixed state', async () => {
      const event = createBasicEvent();
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory;
      mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
      mandatory.M.test.M.state.N = OrchestratorComponentState.Complete;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeNull();
    });

    test('Basic - multiple items complete state', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain('#Rate.#async.#status.#state = :Rateasyncstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateasyncstate'])
        .toBe(OrchestratorComponentState.Complete);
    });

    test('Basic - multiple items one error state', async () => {
      const event = createBasicEvent();
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory;
      mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
      mandatory.M.test.M.state.S = OrchestratorComponentState.Error;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#async.#status.#state = :Rateasyncstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateasyncstate'])
        .toBe(OrchestratorComponentState.Error);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.Error);
    });

    test('Basic - async not started', async () => {
      const event = createBasicEvent();
      const status = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.status;
      status.M.state.S = OrchestratorComponentState.NotStarted;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory.M = {}; // .M.state.S = OrchestratorComponentState.NotStarted;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeNull();
    });

    test('Optional in progress', async () => {
      const event = createOptionalEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
      const mandatory = rate.M.async.M.mandatory;
      const optional = rate.M.async.M.optional;
      optional.M.test = JSON.parse(JSON.stringify(mandatory.M.test));
      optional.M.test.M.state.S = OrchestratorComponentState.InProgress;
      rate.M.status.M.state = OrchestratorComponentState.InProgress;

      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#async.#status.#state = :Rateasyncstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateasyncstate'])
        .toBe(OrchestratorComponentState.MandatoryCompleted);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#status.#state = :Ratestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratestate'])
        .toBe(OrchestratorComponentState.MandatoryCompleted);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.MandatoryCompleted);
    });

    test('Optional error', async () => {
      const event = createOptionalEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
      const mandatory = rate.M.async.M.mandatory;
      const optional = rate.M.async.M.optional;
      optional.M.test = JSON.parse(JSON.stringify(mandatory.M.test));
      optional.M.test.M.state.S = OrchestratorComponentState.Error;
      rate.M.status.M.state = OrchestratorComponentState.InProgress;

      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#async.#status.#state = :Rateasyncstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateasyncstate'])
        .toBe(OrchestratorComponentState.OptionalError);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#status.#state = :Ratestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratestate'])
        .toBe(OrchestratorComponentState.OptionalError);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.OptionalError);
    });

    test('Optional complete', async () => {
      const event = createOptionalEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
      const mandatory = rate.M.async.M.mandatory;
      const optional = rate.M.async.M.optional;
      optional.M.test = JSON.parse(JSON.stringify(mandatory.M.test));
      optional.M.test.M.state.S = OrchestratorComponentState.Complete;
      rate.M.status.M.state = OrchestratorComponentState.InProgress;

      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#async.#status.#state = :Rateasyncstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateasyncstate'])
        .toBe(OrchestratorComponentState.Complete);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#status.#state = :Ratestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratestate'])
        .toBe(OrchestratorComponentState.Complete);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.Complete);
    });
  });

  describe('pre', () => {
    test('Basic - single item null - pre', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory.M.test.NULL = true;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeNull();
    });

    test('Basic - single item complete status change - pre', async () => {
      const event = createBasicEvent();
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain('#Rate.#pre.#status.#state = :Rateprestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateprestate'])
        .toBe(OrchestratorComponentState.Complete);
      expect(dynamoDal.updateInput.ExpressionAttributeNames['#pre']).toBe('pre');
    });

    test('Basic - multiple items mixed state - pre', async () => {
      const event = createBasicEvent();
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory;
      mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
      mandatory.M.test.M.state.N = OrchestratorComponentState.Complete;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeNull();
    });

    test('Basic - multiple items complete state - pre', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain('#Rate.#pre.#status.#state = :Rateprestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateprestate'])
        .toBe(OrchestratorComponentState.Complete);
    });

    test('Basic - multiple items one error state - pre', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory;
      mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
      mandatory.M.test.M.state.S = OrchestratorComponentState.Error;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#pre.#status.#state = :Rateprestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateprestate'])
        .toBe(OrchestratorComponentState.Error);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.Error);
    });

    test('Basic - pre not started - pre', async () => {
      const event = createBasicEvent();
      const status = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.status;
      status.M.state.S = OrchestratorComponentState.NotStarted;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory.M = {}; // .M.state.S = OrchestratorComponentState.NotStarted;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeNull();
    });

    test('Optional in progress - pre', async () => {
      const event = createOptionalEvent();
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.mandatory.M = {};
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M = {};

      const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
      const mandatory = rate.M.pre.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const optional = rate.M.pre.M.optional = { M: {} as any };
      optional.M.test = JSON.parse(JSON.stringify(mandatory.M.test));
      optional.M.test.M.state.S = OrchestratorComponentState.InProgress;
      rate.M.status.M.state = OrchestratorComponentState.InProgress;

      await updateActivityStatus(event);

      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#pre.#status.#state = :Rateprestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateprestate'])
        .toBe(OrchestratorComponentState.MandatoryCompleted);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#status.#state = :Ratestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratestate'])
        .toBe(OrchestratorComponentState.MandatoryCompleted);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.MandatoryCompleted);
    });

    test('Optional error - pre', async () => {
      const event = createOptionalEvent();
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
      const mandatory = rate.M.pre.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const optional = rate.M.pre.M.optional = { M: {} as any };
      optional.M.test = JSON.parse(JSON.stringify(mandatory.M.test));
      optional.M.test.M.state.S = OrchestratorComponentState.Error;
      rate.M.status.M.state = OrchestratorComponentState.InProgress;

      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#pre.#status.#state = :Rateprestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateprestate'])
        .toBe(OrchestratorComponentState.OptionalError);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#status.#state = :Ratestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratestate'])
        .toBe(OrchestratorComponentState.OptionalError);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.OptionalError);
    });

    test('Optional complete - pre', async () => {
      const event = createOptionalEvent();

      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .async.M.status.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.status.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
      const mandatory = rate.M.pre.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const optional = rate.M.pre.M.optional = { M: {} as any };
      optional.M.test = JSON.parse(JSON.stringify(mandatory.M.test));
      optional.M.test.M.state.S = OrchestratorComponentState.Complete;
      rate.M.status.M.state = OrchestratorComponentState.InProgress;
      rate.M.pre.M.status.M.state = OrchestratorComponentState.InProgress;

      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#pre.#status.#state = :Rateprestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Rateprestate'])
        .toBe(OrchestratorComponentState.Complete);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#status.#state = :Ratestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratestate'])
        .toBe(OrchestratorComponentState.Complete);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.Complete);
    });

    test('Basic - single item error status change - pre', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory.M = {};
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory.M = {};
      const pre = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M;
      pre.mandatory.M.test.M.state.S = OrchestratorComponentState.Error;
      pre.status.M = {
        state: { S: OrchestratorComponentState.InProgress },
        token: { S: 'test' },
        startTime: { S: '2020-01-01' }
      };
      await updateActivityStatus(event);
      expect(stepFunctions.sendTaskSuccess).toBeCalledTimes(0);
      expect(stepFunctions.sendTaskFailure).toBeCalledTimes(1);
    });

    test('Basic - not started, has items - pre', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory.M = {};
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory.M = {};
      const pre = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M;
      pre.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
      pre.status.M = {
        state: { S: OrchestratorComponentState.NotStarted },
        token: { S: 'test' },
        startTime: { S: '2020-01-01' }
      };
      await updateActivityStatus(event);
      expect(stepFunctions.sendTaskSuccess).toBeCalledTimes(0);
      expect(stepFunctions.sendTaskFailure).toBeCalledTimes(0);
    });
  });

  describe('post', () => {
    test('Basic - single item null - post', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory.M.test.NULL = true;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeNull();
    });

    test('Basic - single item complete status change - post', async () => {
      const event = createBasicEvent();
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain('#Rate.#post.#status.#state = :Ratepoststate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratepoststate'])
        .toBe(OrchestratorComponentState.Complete);

      expect(dynamoDal.updateInput.ExpressionAttributeNames['#post']).toBe('post');
    });

    test('Basic - multiple items mixed state - post', async () => {
      const event = createBasicEvent();
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory;
      mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
      mandatory.M.test.M.state.N = OrchestratorComponentState.Complete;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeNull();
    });

    test('Basic - multiple items complete state - post', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain('#Rate.#post.#status.#state = :Ratepoststate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratepoststate'])
        .toBe(OrchestratorComponentState.Complete);
    });

    test('Basic - multiple items one error state - post', async () => {
      const event = createBasicEvent();
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory;
      mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
      mandatory.M.test.M.state.S = OrchestratorComponentState.Error;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#post.#status.#state = :Ratepoststate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratepoststate'])
        .toBe(OrchestratorComponentState.Error);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.Error);
    });

    test('Basic - post not started - post', async () => {
      const event = createBasicEvent();
      const status = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.status;
      status.M.state.S = OrchestratorComponentState.NotStarted;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory.M = {}; // .M.state.S = OrchestratorComponentState.NotStarted;
      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeNull();
    });

    test('Optional in progress - post', async () => {
      const event = createOptionalEvent();
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
      const mandatory = rate.M.post.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const optional = rate.M.post.M.optional = { M: {} as any };
      optional.M.test = JSON.parse(JSON.stringify(mandatory.M.test));
      optional.M.test.M.state.S = OrchestratorComponentState.InProgress;
      rate.M.status.M.state = OrchestratorComponentState.InProgress;

      await updateActivityStatus(event);

      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#post.#status.#state = :Ratepoststate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratepoststate'])
        .toBe(OrchestratorComponentState.MandatoryCompleted);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#status.#state = :Ratestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratestate'])
        .toBe(OrchestratorComponentState.MandatoryCompleted);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.MandatoryCompleted);
    });

    test('Optional error - post', async () => {
      const event = createOptionalEvent();
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
      const mandatory = rate.M.post.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const optional = rate.M.post.M.optional = { M: {} as any };
      optional.M.test = JSON.parse(JSON.stringify(mandatory.M.test));
      optional.M.test.M.state.S = OrchestratorComponentState.Error;
      rate.M.status.M.state = OrchestratorComponentState.InProgress;

      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#post.#status.#state = :Ratepoststate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratepoststate'])
        .toBe(OrchestratorComponentState.OptionalError);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#status.#state = :Ratestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratestate'])
        .toBe(OrchestratorComponentState.OptionalError);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.OptionalError);
    });

    test('Optional complete - post', async () => {
      const event = createOptionalEvent();

      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .async.M.status.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.OldImage.activities.M.Rate.M
        .pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .async.M.status.M.state.S = OrchestratorComponentState.Complete;
      event.Records[0].dynamodb.NewImage.activities.M.Rate.M
        .pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
      const mandatory = rate.M.post.M.mandatory;
      mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

      const optional = rate.M.post.M.optional = { M: {} as any };
      optional.M.test = JSON.parse(JSON.stringify(mandatory.M.test));
      optional.M.test.M.state.S = OrchestratorComponentState.Complete;
      rate.M.status.M.state = OrchestratorComponentState.InProgress;
      rate.M.post.M.status.M.state = OrchestratorComponentState.InProgress;

      await updateActivityStatus(event);
      expect(dynamoDal.updateInput).toBeDefined();
      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#post.#status.#state = :Ratepoststate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratepoststate'])
        .toBe(OrchestratorComponentState.Complete);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#Rate.#status.#state = :Ratestate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':Ratestate'])
        .toBe(OrchestratorComponentState.Complete);

      expect(dynamoDal.updateInput.UpdateExpression).toContain(
        '#status.#state = :workflowstate');
      expect(dynamoDal.updateInput.ExpressionAttributeValues[':workflowstate'])
        .toBe(OrchestratorComponentState.Complete);
    });
  });

  test('No Pre', async () => {
    const event = createBasicEvent();
    const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
    delete rate.M.pre;

    await updateActivityStatus(event);
    expect(dynamoDal.updateInput).toBeNull();
  });

  test('No post', async () => {
    const event = createBasicEvent();
    const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
    delete rate.M.post;

    await updateActivityStatus(event);
    expect(dynamoDal.updateInput).toBeNull();
  });

  test('No async', async () => {
    const event = createBasicEvent();
    const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
    delete rate.M.async;

    await updateActivityStatus(event);
    expect(dynamoDal.updateInput).toBeNull();
  });

  test('No status', async () => {
    const event = createBasicEvent();
    delete event.Records[0].dynamodb.NewImage.activities.M.Rate.M.status;
    await updateActivityStatus(event);
    expect(dynamoDal.updateInput).toBeNull();
  });
});

describe('validate Async', () => {
  test('Async Complete, mandatory in progress', () => {
    // arrange
    const activity = 'Rate';
    const activityStatus =
                {
                  Rate: {
                    async: {
                      optional: {},
                      mandatory: { 'DRC Rating': { state: 'In Progress' } },
                      status: { state: 'Complete', message: ' ' }
                    },
                    pre: {
                      optional: {},
                      mandatory: {},
                      status: { state: 'Complete', message: ' ' }
                    },
                    post: {
                      optional: {},
                      mandatory: {},
                      status: { state: 'Complete', message: ' ' }
                    },
                    status: { state: 'Complete' }
                  }
                } as { [key: string]: OrchestratorActivityStatus };
    const updates = []; const attributes = {}; const fieldNames = {};

    const overall = {
      uid: '123456',
      workflow: 'test workflow'
    } as any;
    // act
    const workflowStatus = new StatusSummary();
    validateActivity(activity, activityStatus, workflowStatus, updates, attributes, fieldNames, overall, new Date());
    // assert
    expect(updates.length).toBe(1);
  });
});

function createBasicEvent (): any {
  const retval = {
    Records: [
      createBasicRecord()
    ]
  };
  return retval;
}

function createOptionalEvent (): any {
  const retval = createBasicEvent();
  const obj = retval.Records[0].dynamodb.NewImage;
  obj.activities.M.Rate.M.pre.M.status.M.state.S = OrchestratorComponentState.Complete;
  obj.activities.M.Rate.M.post.M.status.M.state.S = OrchestratorComponentState.Complete;
  obj.activities.M.Rate.M.async.M.status.M.state.S = OrchestratorComponentState.InProgress;
  obj.activities.M.Rate.M.async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
  obj.activities.M.Rate.M.async.M.optional = { M: {} };
  obj.activities.M.Rate.M.status.M.state.S = OrchestratorComponentState.Complete;

  return retval;
}

function createBasicRecord (): any {
  return {
    dynamodb: {
      NewImage: {
        uid: { S: '123' },
        workflow: { S: 'Test' },
        status: {
          M: {
            state: { S: OrchestratorComponentState.InProgress }
          }
        },
        activities: {
          M: {
            Rate: {
              M: {
                pre: {
                  M: {
                    mandatory: {
                      M: {
                        test: {
                          M: {
                            state: { S: OrchestratorComponentState.InProgress },
                            message: { S: '' }
                          }
                        }
                      }
                    },
                    status: {
                      M: {
                        state: { S: OrchestratorComponentState.InProgress },
                        message: { NULL: true }
                      }
                    }
                  }
                },
                post: {
                  M: {
                    mandatory: {
                      M: {
                        test: {
                          M: {
                            state: { S: OrchestratorComponentState.InProgress },
                            message: { S: '' }
                          }
                        }
                      }
                    },
                    status: {
                      M: {
                        state: { S: OrchestratorComponentState.InProgress },
                        message: { NULL: true }
                      }
                    }
                  }
                },
                async: {
                  M: {
                    mandatory: {
                      M: {
                        test: {
                          M: {
                            state: { S: OrchestratorComponentState.InProgress },
                            message: { S: '' }
                          }
                        }
                      }
                    },
                    status: {
                      M: {
                        state: { S: OrchestratorComponentState.InProgress },
                        message: { NULL: true }
                      }
                    }
                  }
                },
                status: {
                  M: {
                    state: { S: OrchestratorComponentState.InProgress },
                    message: { NULL: true }
                  }
                }
              }
            }
          }
        }

      },
      OldImage: {
        uid: { S: '123' },
        workflow: { S: 'Test' },
        status: {
          M: {
            state: { S: OrchestratorComponentState.InProgress }
          }
        },
        activities: {
          M: {
            Rate: {
              M: {
                pre: {
                  M: {
                    mandatory: {
                      M: {
                        test: {
                          M: {
                            state: { S: OrchestratorComponentState.InProgress },
                            message: { S: '' }
                          }
                        }
                      }
                    },
                    status: {
                      M: {
                        state: { S: OrchestratorComponentState.InProgress },
                        message: { NULL: true }
                      }
                    }
                  }
                },
                post: {
                  M: {
                    mandatory: {
                      M: {
                        test: {
                          M: {
                            state: { S: OrchestratorComponentState.InProgress },
                            message: { S: '' }
                          }
                        }
                      }
                    },
                    status: {
                      M: {
                        state: { S: OrchestratorComponentState.InProgress },
                        message: { NULL: true }
                      }
                    }
                  }
                },
                async: {
                  M: {
                    mandatory: {
                      M: {
                        test: {
                          M: {
                            state: { S: OrchestratorComponentState.InProgress },
                            message: { S: '' }
                          }
                        }
                      }
                    },
                    status: {
                      M: {
                        state: { S: OrchestratorComponentState.InProgress },
                        message: { NULL: true }
                      }
                    }
                  }
                },
                status: {
                  M: {
                    state: { S: OrchestratorComponentState.InProgress },
                    message: { NULL: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}

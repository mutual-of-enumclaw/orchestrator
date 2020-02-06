/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { updateActivityStatus, setDynamoDal, validateActivity, StatusSummary, setStepFunctions } from './handleSummary';
import { MockDynamoDb } from '../../__mock__/mockDynamoDb';
import { OrchestratorComponentState, OrchestratorActivityStatus } from '..';
import { DynamoDB } from 'aws-sdk';

class MockStepFunctions {
    sendTaskSuccess = jest.fn();
}
console.log = () => {};

describe("updateActivityStatus", () => {
    process.env.environment = 'unit-test';
    const dynamoDal = new MockDynamoDb();
    const stepFunctions = new MockStepFunctions();
    setDynamoDal(dynamoDal as any);
    setStepFunctions(stepFunctions as any);

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
        dynamoDal.reset();
        await updateActivityStatus(createBasicEvent());
        expect(dynamoDal.updateInput).toBeNull();
    });

    describe('async', () => {
        test('Basic - async not started', async () => {
            dynamoDal.reset();
            const event = createBasicEvent();
            const status = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.status;
            status.M.state.S = OrchestratorComponentState.NotStarted;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory.M = {}; 
            await updateActivityStatus(event);
            expect(dynamoDal.updateInput).toBeNull();
        });
        
        test('Basic - single item null', async () => {
            dynamoDal.reset();
            const event = createBasicEvent();
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory.M.test.NULL = true;
            await updateActivityStatus(event);
            expect(dynamoDal.updateInput).toBeNull();
        });
    
        test('Basic - single item complete status change', async () => {
            dynamoDal.reset();
            const event = createBasicEvent();
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
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
            dynamoDal.reset();
            const event = createBasicEvent();
            const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory;
            mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
            mandatory.M.test.M.state.N = OrchestratorComponentState.Complete;
            await updateActivityStatus(event);
            expect(dynamoDal.updateInput).toBeNull();
        });
    
        test('Basic - multiple items complete state', async () => {
            dynamoDal.reset();
            const event = createBasicEvent();
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
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
            dynamoDal.reset();
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
            dynamoDal.reset();
            const event = createBasicEvent();
            const status = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.status;
            status.M.state.S = OrchestratorComponentState.NotStarted;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.async.M.mandatory.M = {}; // .M.state.S = OrchestratorComponentState.NotStarted;
            await updateActivityStatus(event);
            expect(dynamoDal.updateInput).toBeNull();
        });
    
        test('Optional in progress', async () => {
            dynamoDal.reset();
            const event = createOptionalEvent();
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
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
            dynamoDal.reset();
            const event = createOptionalEvent();
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
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
            dynamoDal.reset();
            const event = createOptionalEvent();
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
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
            dynamoDal.reset();
            const event = createBasicEvent();
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory.M.test.NULL = true;
            await updateActivityStatus(event);
            expect(dynamoDal.updateInput).toBeNull();
        });
    
        test('Basic - single item complete status change - pre', async () => {
            dynamoDal.reset();
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
            dynamoDal.reset();
            const event = createBasicEvent();
            const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory;
            mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
            mandatory.M.test.M.state.N = OrchestratorComponentState.Complete;
            await updateActivityStatus(event);
            expect(dynamoDal.updateInput).toBeNull();
        });
    
        test('Basic - multiple items complete state - pre', async () => {
            dynamoDal.reset();
            const event = createBasicEvent();
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
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
            dynamoDal.reset();
            const event = createBasicEvent();
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
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
            dynamoDal.reset();
            const event = createBasicEvent();
            const status = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.status;
            status.M.state.S = OrchestratorComponentState.NotStarted;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.pre.M.mandatory.M = {}; // .M.state.S = OrchestratorComponentState.NotStarted;
            await updateActivityStatus(event);
            expect(dynamoDal.updateInput).toBeNull();
        });
    
        test('Optional in progress - pre', async () => {
            dynamoDal.reset();
            const event = createOptionalEvent();
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;

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
            dynamoDal.reset();
            const event = createOptionalEvent();
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

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
            dynamoDal.reset();
            const event = createOptionalEvent();
            
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                async.M.status.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.status.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

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
    });
    

    describe('post', () => {
        test('Basic - single item null - post', async () => {
            dynamoDal.reset();
            const event = createBasicEvent();
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory.M.test.NULL = true;
            await updateActivityStatus(event);
            expect(dynamoDal.updateInput).toBeNull();
        });
    
        test('Basic - single item complete status change - post', async () => {
            dynamoDal.reset();
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
            dynamoDal.reset();
            const event = createBasicEvent();
            const mandatory = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory;
            mandatory.M.test2 = JSON.parse(JSON.stringify(mandatory.M.test));
            mandatory.M.test.M.state.N = OrchestratorComponentState.Complete;
            await updateActivityStatus(event);
            expect(dynamoDal.updateInput).toBeNull();
        });
    
        test('Basic - multiple items complete state - post', async () => {
            dynamoDal.reset();
            const event = createBasicEvent();
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.NotStarted;
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
            dynamoDal.reset();
            const event = createBasicEvent();
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
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
            dynamoDal.reset();
            const event = createBasicEvent();
            const status = event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.status;
            status.M.state.S = OrchestratorComponentState.NotStarted;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.post.M.mandatory.M = {}; // .M.state.S = OrchestratorComponentState.NotStarted;
            await updateActivityStatus(event);
            expect(dynamoDal.updateInput).toBeNull();
        });
    
        test('Optional in progress - post', async () => {
            dynamoDal.reset();
            const event = createOptionalEvent();
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

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
            dynamoDal.reset();
            const event = createOptionalEvent();
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                post.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

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
            dynamoDal.reset();
            const event = createOptionalEvent();
            
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                async.M.status.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.OldImage.activities.M.Rate.M.
                pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                async.M.status.M.state.S = OrchestratorComponentState.Complete;
            event.Records[0].dynamodb.NewImage.activities.M.Rate.M.
                pre.M.mandatory.M.test.M.state.S = OrchestratorComponentState.Complete;

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
        dynamoDal.reset();
        const event = createBasicEvent();
        const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
        delete rate.M.pre;

        await updateActivityStatus(event);
        expect(dynamoDal.updateInput).toBeNull();
    });

    test('No post', async () => {
        dynamoDal.reset();
        const event = createBasicEvent();
        const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
        delete rate.M.post;

        await updateActivityStatus(event);
        expect(dynamoDal.updateInput).toBeNull();
    });

    test('No async', async () => {
        dynamoDal.reset();
        const event = createBasicEvent();
        const rate = event.Records[0].dynamodb.NewImage.activities.M.Rate;
        delete rate.M.async;

        await updateActivityStatus(event);
        expect(dynamoDal.updateInput).toBeNull();
    });

    test('No status', async () => {
        dynamoDal.reset();
        const event = createBasicEvent();
        delete event.Records[0].dynamodb.NewImage.activities.M.Rate.M.status;
        await updateActivityStatus(event);
        expect(dynamoDal.updateInput).toBeNull();
    });

    test('Rate not bubbling up bug', async () => {
        dynamoDal.reset();
        const event = createBasicEvent();
        event.Records[0].dynamodb.NewImage = DynamoDB.Converter.marshall(require('../data/rating-bug.json'));
        event.Records[0].dynamodb.OldImage = DynamoDB.Converter.marshall(require('../data/rating-bug.json'));
        await updateActivityStatus(event);
        expect(dynamoDal.updateInput).toBeTruthy();
    });
});

describe('validate Async', () => {
    test('Async Complete, mandatory in progress', () => {
        // arrange
        const activity = "Rate",
            activityStatus =
                {
                    "Rate": {
                        "async": {
                            "optional": {},
                            "mandatory": { "DRC Rating": { "state": "In Progress" } },
                            "status": { "state": "Complete", "message": " " }
                        },
                        "pre": {
                            optional: {},
                            mandatory: {},
                            "status": { "state": "Complete", "message": " " } 
                        },
                        "post": {
                            optional: {},
                            mandatory: {},
                            "status": { "state": "Complete", "message": " " } 
                        },
                        "status": { "state": "Complete" }
                    }
                } as {[key: string] : OrchestratorActivityStatus },
            updates = [], attributes = {}, fieldNames = {};

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


describe('setDynamoDal', () => {
    test('Non-unit test env', () => {
        process.env.environment = 'not unit test';
        let error = null;
        try {
            setDynamoDal({} as any);
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('Unit testing feature being used outside of unit testing');
    });
});

function createBasicEvent(): any {
    const retval = {
        Records: [
            createBasicRecord()
        ]
    };
    return retval;
}

function createOptionalEvent(): any {
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

function createBasicRecord(): any {
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
                                                message: { NULL: true },
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
                                                message: { NULL: true },
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
                                                message: { NULL: true },
                                            }
                                        }
                                    }
                                },
                                status: {
                                    M: {
                                        state: { S: OrchestratorComponentState.InProgress },
                                        message: { NULL: true },
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
                                                message: { NULL: true },
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
                                                message: { NULL: true },
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
                                                message: { NULL: true },
                                            }
                                        }
                                    }
                                },
                                status: {
                                    M: {
                                        state: { S: OrchestratorComponentState.InProgress },
                                        message: { NULL: true },
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


const badRecord = {
    "Records": [
        {
            "eventID": "e32e44d98b00f2f06b8a8a5eff019684",
            "eventName": "MODIFY",
            "eventVersion": "1.1",
            "eventSource": "aws:dynamodb",
            "awsRegion": "us-west-2",
            "dynamodb": {
                "ApproximateCreationDateTime": 1555340391,
                "Keys": {
                    "uid": {
                        "S": "b44d758a-f7c2-a777-98eb-e4b3a8753534"
                    },
                    "workflow": {
                        "S": "issue"
                    }
                },
                "NewImage": {
                    "ValidateIssue": {
                        "M": {
                            "async": {
                                "M": {
                                    "optional": {
                                        "M": {}
                                    },
                                    "mandatory": {
                                        "M": {}
                                    },
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Complete"
                                            }
                                        }
                                    }
                                }
                            },
                            "pre": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Not Started"
                                            }
                                        }
                                    }
                                }
                            },
                            "post": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Not Started"
                                            }
                                        }
                                    }
                                }
                            },
                            "status": {
                                "M": {
                                    "state": {
                                        "S": "In Progress"
                                    }
                                }
                            }
                        }
                    },
                    "uid": {
                        "S": "b44d758a-f7c2-a777-98eb-e4b3a8753534"
                    },
                    "metadata": {
                        "M": {
                            "lineOfBusiness": {
                                "S": "packageAuto"
                            },
                            "workflow": {
                                "S": "issue"
                            },
                            "policies": {
                                "L": [
                                    {
                                        "S": "b9f3e752-90f0-c1d2-f0ab-aa7e40fb3ac1"
                                    },
                                    {
                                        "S": "1641f21a-2de3-dd7f-c647-da22d431bcff"
                                    },
                                    {
                                        "S": "e3d3f1dd-9a87-6611-4fe6-a618b2d2775b"
                                    }
                                ]
                            },
                            "company": {
                                "S": "01"
                            },
                            "riskState": {
                                "S": "ID"
                            },
                            "effectiveDate": {
                                "S": "2019-04-15T07:00:00.000Z"
                            }
                        }
                    },
                    "Issue": {
                        "M": {
                            "async": {
                                "M": {
                                    "optional": {
                                        "M": {}
                                    },
                                    "mandatory": {
                                        "M": {}
                                    },
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Complete"
                                            }
                                        }
                                    }
                                }
                            },
                            "pre": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Not Started"
                                            }
                                        }
                                    }
                                }
                            },
                            "post": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Not Started"
                                            }
                                        }
                                    }
                                }
                            },
                            "status": {
                                "M": {
                                    "state": {
                                        "S": "In Progress"
                                    }
                                }
                            }
                        }
                    },
                    "workflow": {
                        "S": "issue"
                    },
                    "Rate": {
                        "M": {
                            "async": {
                                "M": {
                                    "optional": {
                                        "M": {}
                                    },
                                    "mandatory": {
                                        "M": {
                                            "DRC Rating": {
                                                "M": {
                                                    "state": {
                                                        "S": "In Progress"
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Complete"
                                            },
                                            "message": {
                                                "S": " "
                                            }
                                        }
                                    }
                                }
                            },
                            "pre": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Complete"
                                            },
                                            "message": {
                                                "S": " "
                                            }
                                        }
                                    }
                                }
                            },
                            "post": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Complete"
                                            },
                                            "message": {
                                                "S": " "
                                            }
                                        }
                                    }
                                }
                            },
                            "status": {
                                "M": {
                                    "state": {
                                        "S": "Complete"
                                    }
                                }
                            }
                        }
                    },
                    "currentDate": {
                        "N": "1555340377400"
                    },
                    "status": {
                        "M": {
                            "state": {
                                "S": "In Progress"
                            }
                        }
                    }
                },
                "OldImage": {
                    "ValidateIssue": {
                        "M": {
                            "async": {
                                "M": {
                                    "optional": {
                                        "M": {}
                                    },
                                    "mandatory": {
                                        "M": {}
                                    },
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Complete"
                                            }
                                        }
                                    }
                                }
                            },
                            "pre": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Not Started"
                                            }
                                        }
                                    }
                                }
                            },
                            "post": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Not Started"
                                            }
                                        }
                                    }
                                }
                            },
                            "status": {
                                "M": {
                                    "state": {
                                        "S": "In Progress"
                                    }
                                }
                            }
                        }
                    },
                    "uid": {
                        "S": "b44d758a-f7c2-a777-98eb-e4b3a8753534"
                    },
                    "metadata": {
                        "M": {
                            "lineOfBusiness": {
                                "S": "packageAuto"
                            },
                            "workflow": {
                                "S": "issue"
                            },
                            "policies": {
                                "L": [
                                    {
                                        "S": "b9f3e752-90f0-c1d2-f0ab-aa7e40fb3ac1"
                                    },
                                    {
                                        "S": "1641f21a-2de3-dd7f-c647-da22d431bcff"
                                    },
                                    {
                                        "S": "e3d3f1dd-9a87-6611-4fe6-a618b2d2775b"
                                    }
                                ]
                            },
                            "company": {
                                "S": "01"
                            },
                            "riskState": {
                                "S": "ID"
                            },
                            "effectiveDate": {
                                "S": "2019-04-15T07:00:00.000Z"
                            }
                        }
                    },
                    "Issue": {
                        "M": {
                            "async": {
                                "M": {
                                    "optional": {
                                        "M": {}
                                    },
                                    "mandatory": {
                                        "M": {}
                                    },
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Complete"
                                            }
                                        }
                                    }
                                }
                            },
                            "pre": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Not Started"
                                            }
                                        }
                                    }
                                }
                            },
                            "post": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Not Started"
                                            }
                                        }
                                    }
                                }
                            },
                            "status": {
                                "M": {
                                    "state": {
                                        "S": "In Progress"
                                    }
                                }
                            }
                        }
                    },
                    "workflow": {
                        "S": "issue"
                    },
                    "Rate": {
                        "M": {
                            "async": {
                                "M": {
                                    "optional": {
                                        "M": {}
                                    },
                                    "mandatory": {
                                        "M": {
                                            "DRC Rating": {
                                                "M": {
                                                    "state": {
                                                        "S": "In Progress"
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Complete"
                                            },
                                            "message": {
                                                "S": " "
                                            }
                                        }
                                    }
                                }
                            },
                            "pre": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Complete"
                                            },
                                            "message": {
                                                "S": " "
                                            }
                                        }
                                    }
                                }
                            },
                            "post": {
                                "M": {
                                    "status": {
                                        "M": {
                                            "state": {
                                                "S": "Complete"
                                            },
                                            "message": {
                                                "S": " "
                                            }
                                        }
                                    }
                                }
                            },
                            "status": {
                                "M": {
                                    "state": {
                                        "S": "In Progress"
                                    }
                                }
                            }
                        }
                    },
                    "currentDate": {
                        "N": "1555340377400"
                    },
                    "status": {
                        "M": {
                            "state": {
                                "S": "In Progress"
                            }
                        }
                    }
                },
                "SequenceNumber": "327343100000000003479218874",
                "SizeBytes": 1799,
                "StreamViewType": "NEW_AND_OLD_IMAGES"
            },
            "eventSourceARN": "arn:aws:dynamodb:us-west-2:025658654491:table/nucleus-orchestrator-core-dev-status/stream/2019-02-05T19:54:20.960"
        }
    ]
};

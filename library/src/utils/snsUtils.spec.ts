/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { SNS } from 'aws-sdk';
import { MockSNS } from '../__mock__/aws';

import { SNSUtils } from './snsUtils';

const sns = new MockSNS(SNS);
const utils = new SNSUtils('Test');

describe('getSubscriberCount', () => {
    test('Null list result', async () => {
        sns.reset();
        sns.listNullResponse = true;
        let error = null;
        try {
            await utils.getSubscriberCount();
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('Could not retrieve information on topic');
    });
    test('SNS Error', async () => {
        sns.reset();
        sns.error = 'test';
        let error = null;
        try {
            await utils.getSubscriberCount();
        } catch (err) {
            error = err;
        }

        expect(error).toBe('test');
    });
    test('Undefined subscriptions', async () => {
        sns.reset();
        sns.listResponse = undefined;
        const result = await utils.getSubscriberCount();
        expect(result).toBe(0);
    });
    test('Empty subscriptions', async () => {
        sns.reset();
        sns.listResponse = [];
        const result = await utils.getSubscriberCount();
        expect(result).toBe(0);
    });
    test('One subscription', async () => {
        sns.reset();
        sns.listResponse = [{}];
        const result = await utils.getSubscriberCount();
        expect(result).toBe(1);
    });
    test('5 subscription', async () => {
        sns.reset();
        sns.listResponse = [{}, {}, {}, {}, {}];
        const result = await utils.getSubscriberCount();
        expect(result).toBe(5);
    });
});

describe('publishWithMetadata', () => {
    test('Empty Message', async () => {
        sns.reset();
        await utils.publishWithMetadata('', null);
        expect(sns.publishInput.Message).toBe('');
        expect(sns.publishInput.MessageAttributes).toBeDefined();
    });
    test('Basic Test w/ attributes null', async () => {
        sns.reset();
        await utils.publishWithMetadata('test', null);
        expect(sns.publishInput.Message).toBe('test');
        expect(sns.publishInput.MessageAttributes).toBeDefined();
    });

    test('Basic Test w/ attributes empty', async () => {
        sns.reset();
        await utils.publishWithMetadata('test', {});
        expect(sns.publishInput.Message).toBe('test');
        expect(sns.publishInput.MessageAttributes).toBeDefined();
    });

    test('Basic Test w/ attributes', async () => {
        sns.reset();
        await utils.publishWithMetadata('test', { test: 1, test2: '2', test3: null });
        expect(sns.publishInput.Message).toBe('test');
        expect(sns.publishInput.MessageAttributes.test.DataType).toBe('Number');
        expect(sns.publishInput.MessageAttributes.test.StringValue).toBe('1');
        expect(sns.publishInput.MessageAttributes.test2.DataType).toBe('String');
        expect(sns.publishInput.MessageAttributes.test2.StringValue).toBe('2');
        expect(sns.publishInput.MessageAttributes.test3).toBeUndefined();
    });

    test('Object Test w/ attributes null', async () => {
        sns.reset();
        await utils.publishWithMetadata({ test: 1 }, null);
        expect(sns.publishInput.Message).toBe(JSON.stringify({ test: 1 }));
        expect(sns.publishInput.MessageAttributes).toBeDefined();
    });

    test('Object Test w/ attributes empty', async () => {
        sns.reset();
        await utils.publishWithMetadata({ test: 2 }, {});
        expect(sns.publishInput.Message).toBe(JSON.stringify({ test: 2 }));
        expect(sns.publishInput.MessageAttributes).toBeDefined();
    });

    test('Object Test w/ attributes', async () => {
        sns.reset();
        await utils.publishWithMetadata({ test: 3 }, { test: 1, test2: '2', test3: null });
        expect(sns.publishInput.Message).toBe(JSON.stringify({ test: 3 }));
        expect(sns.publishInput.MessageAttributes.test.DataType).toBe('Number');
        expect(sns.publishInput.MessageAttributes.test.StringValue).toBe('1');
        expect(sns.publishInput.MessageAttributes.test2.DataType).toBe('String');
        expect(sns.publishInput.MessageAttributes.test2.StringValue).toBe('2');
        expect(sns.publishInput.MessageAttributes.test3).toBeUndefined();
    });
});

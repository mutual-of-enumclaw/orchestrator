import { DynamoDB } from 'aws-sdk';
import { MockDynamoDb } from '../__mock__/aws';

import { MetricsDb } from './metricsDb';
const dynamoDb = new MockDynamoDb(DynamoDB.DocumentClient);
const metricsDb = new MetricsDb(dynamoDb as any);

describe('putIssueFailure', () => {
    beforeEach(() => {
        dynamoDb.reset();
    });
    test('Empty', async () => {
        const time = (new Date().getTime() + (1000 * 60 * 15)) / 1000;
        await metricsDb.putIssueFailure('', '');
        expect(dynamoDb.putInput.Item.uid).toBe('');
        expect(dynamoDb.putInput.Item.workflow).toBe('');
        expect(dynamoDb.putInput.Item.timeout).toBeGreaterThanOrEqual(time);
    });

    test('Valid', async () => {
        const time = (new Date().getTime() + (1000 * 60 * 15)) / 1000;
        await metricsDb.putIssueFailure('test', '123');
        expect(dynamoDb.putInput.Item.uid).toBe('123');
        expect(dynamoDb.putInput.Item.workflow).toBe('test');
        expect(dynamoDb.putInput.Item.timeout).toBeGreaterThanOrEqual(time);
    });
});

describe('getIssueFailures', () => {
    beforeEach(() => {
        dynamoDb.reset();
    });

    test('15', async () => {
        dynamoDb.scanReturn = {
            Items: [{}, {}]
        } as any;
        const result = await metricsDb.getIssueFailures();
        expect(result.length).toBe(2);
    });

    test('1', async () => {
        dynamoDb.scanReturn = {
            Items: [{}]
        } as any;
        const result = await metricsDb.getIssueFailures();
        expect(result.length).toBe(1);
    });

    test('0', async () => {
        dynamoDb.scanReturn = {
            Items: []
        } as any;
        const result = await metricsDb.getIssueFailures();
        expect(result.length).toBe(0);
    });

    test('Null', async () => {
        dynamoDb.scanReturn = {
            Items: null
        } as any;
        const result = await metricsDb.getIssueFailures();
        expect(result.length).toBe(0);
    });

    test('Undefined', async () => {
        dynamoDb.scanReturn = {} as any;
        const result = await metricsDb.getIssueFailures();
        expect(result.length).toBe(0);
    });
});

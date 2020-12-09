import { MetricsDb } from './metricsDb';
import { MockDynamoDb } from '../__mock__/aws';

const dynamoDb = new MockDynamoDb();
const metricsDb = new MetricsDb(dynamoDb as any);
describe('putIssueFailure', () => {
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
  metricsDb.dynamoDb = dynamoDb as any;

  test('15', async () => {
    dynamoDb.scanRetval = {
      Items: [{}, {}]
    } as any;
    const result = await metricsDb.getIssueFailures();
    expect(result.length).toBe(2);
  });

  test('1', async () => {
    dynamoDb.scanRetval = {
      Items: [{}]
    } as any;
    const result = await metricsDb.getIssueFailures();
    expect(result.length).toBe(1);
  });

  test('0', async () => {
    dynamoDb.scanRetval = {
      Items: []
    } as any;
    const result = await metricsDb.getIssueFailures();
    expect(result.length).toBe(0);
  });

  test('Null', async () => {
    dynamoDb.scanRetval = {
      Items: null
    } as any;
    const result = await metricsDb.getIssueFailures();
    expect(result.length).toBe(0);
  });

  test('Undefined', async () => {
    dynamoDb.scanRetval = {} as any;
    const result = await metricsDb.getIssueFailures();
    expect(result.length).toBe(0);
  });
});

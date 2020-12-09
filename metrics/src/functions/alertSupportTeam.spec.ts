import * as alertSupportTeam from './alertSupportTeam';
import { MockSns } from '@moe-tech/orch-metrics-lib/__mock__/aws';
import { MockMetricsDb } from '@moe-tech/orch-metrics-lib/__mock__/dal';

const mock = new MockSns();
const metricDb = new MockMetricsDb();

describe('handler', () => {
  process.env.environment = 'unit-test';
  alertSupportTeam.setSns(mock as any);
  alertSupportTeam.setMetricsDb(metricDb as any);

  test('Null Body', async () => {
    mock.reset();
    metricDb.reset();
    let error = null;
    try {
      await alertSupportTeam.handler(null, null, null);
    } catch (err) {
      error = err.message;
    }
    expect(error).toBe('The event does not contain required fields');
    expect(mock.called).toBe(0);
    expect(metricDb.putIssueFailureCallCount).toBe(0);
  });

  test('No id provided', async () => {
    mock.reset();
    metricDb.reset();
    let error = null;
    try {
      await alertSupportTeam.handler({ workflow: 'test' } as any, null, null);
    } catch (err) {
      error = err.message;
    }
    expect(error).toBe('The event does not contain required fields');
    expect(mock.called).toBe(0);
    expect(metricDb.putIssueFailureCallCount).toBe(0);
  });

  test('No workflow provided', async () => {
    mock.reset();
    metricDb.reset();
    let error = null;
    try {
      await alertSupportTeam.handler({ uid: 'test' } as any, null, null);
    } catch (err) {
      error = err.message;
    }
    expect(error).toBe('The event does not contain required fields');
    expect(mock.called).toBe(0);
    expect(metricDb.putIssueFailureCallCount).toBe(0);
  });

  test('Id and workflow provided', async () => {
    mock.reset();
    metricDb.reset();
    await alertSupportTeam.handler({ uid: '123', workflow: 'test' } as any, null, null);
    expect(mock.called).toBe(1);
    expect(metricDb.putIssueFailureCallCount).toBe(1);
  });

  test('Second Pass', async () => {
    mock.reset();
    metricDb.reset();
    await alertSupportTeam.handler({ uid: '123', workflow: 'test', alertSent: true } as any, null, null);
    expect(mock.called).toBe(0);
    expect(metricDb.putIssueFailureCallCount).toBe(1);
  });
});

describe('unit-test utils', () => {
  process.env.environment = 'not unit test';
  test('setSns', async () => {
    let error = null;
    try {
      alertSupportTeam.setSns(null);
    } catch (err) {
      error = err.message;
    }
    expect(error).toBe('A system is trying to use a unit test capability');
  });

  test('setDynamoDb', async () => {
    let error = null;
    try {
      alertSupportTeam.setMetricsDb(null);
    } catch (err) {
      error = err.message;
    }
    expect(error).toBe('A system is trying to use a unit test capability');
  });
});

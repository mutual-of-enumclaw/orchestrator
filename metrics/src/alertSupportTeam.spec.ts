import { MetricsDb } from '@moe-tech/orchestrator';
import { MockSNS } from '@moe-tech/orchestrator/__mock__/aws';
import { MockMetricsDb } from '@moe-tech/orchestrator/__mock__/dals';
import { SNS } from 'aws-sdk';

process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });

const mock = new MockSNS(SNS);
const metricDb = new MockMetricsDb(MetricsDb);

import * as alertSupportTeam from './alertSupportTeam';

describe('handler', () => {
    beforeEach(() => {
        mock.reset();
        metricDb.reset();
    });

    test('Null Body', async () => {
        let error = null;
        try {
            await alertSupportTeam.handler(null, null, null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('The event does not contain required fields');
        expect(mock.publish).toBeCalledTimes(0);
        expect(metricDb.putIssueFailure).toBeCalledTimes(0);
    });

    test('No id provided', async () => {
        let error = null;
        try {
            await alertSupportTeam.handler({ workflow: 'test' } as any, null, null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('The event does not contain required fields');
        expect(mock.publish).toBeCalledTimes(0);
        expect(metricDb.putIssueFailure).toBeCalledTimes(0);
    });

    test('No workflow provided', async () => {
        let error = null;
        try {
            await alertSupportTeam.handler({ uid: 'test' } as any, null, null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('The event does not contain required fields');
        expect(mock.publish).toBeCalledTimes(0);
        expect(metricDb.putIssueFailure).toBeCalledTimes(0);
    });

    test('Id and workflow provided', async () => {
        await alertSupportTeam.handler({ uid: '123', workflow: 'test' } as any, null, null);
        expect(mock.publish).toBeCalledTimes(1);
        expect(metricDb.putIssueFailure).toBeCalledTimes(1);
    });

    test('Second Pass', async () => {
        await alertSupportTeam.handler({ uid: '123', workflow: 'test', alertSent: true } as any, null, null);
        expect(mock.publish).toBeCalledTimes(0);
        expect(metricDb.putIssueFailure).toBeCalledTimes(1);
    });
});

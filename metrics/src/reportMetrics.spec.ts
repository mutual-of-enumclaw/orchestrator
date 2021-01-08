import * as reportMetrics from './reportMetrics';
import { MockMetricsDb, MockMetricReporting, MockWorkflowRegister } from '@moe-tech/orchestrator/__mock__/dals';
import { MetricsReporting, WorkflowRegister, MetricsDb } from '@moe-tech/orchestrator';

process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
const metricsReporting = new MockMetricReporting(MetricsReporting);
const metricsDb = new MockMetricsDb(MetricsDb);
const register = new MockWorkflowRegister(WorkflowRegister);

describe('handler', () => {
    process.env.environment = 'unit-test';
    reportMetrics.setMetricsReporting(metricsReporting as any);
    reportMetrics.setMetricsDb(metricsDb as any);
    reportMetrics.setWorkflowRegister(register as any);

    test('Null db result', async () => {
        metricsReporting.reset();
        metricsDb.reset();
        register.reset();
        metricsDb.getIssueFailureCountRetval = null;
        register.listResult = ['test'];

        await reportMetrics.handler(null, null, null);

        expect(metricsReporting.reportFailuresInput.length).toBe(1);
        expect(metricsReporting.reportFailuresInput[0].count).toBe(0);
        expect(metricsReporting.reportFailuresInput[0].workflow).toBe('test');
    });

    test('No registered workflows', async () => {
        metricsReporting.reset();
        metricsDb.reset();
        register.reset();
        register.listResult = [];
        metricsDb.getIssueFailureCountRetval = [{ workflow: 'test' }];

        await reportMetrics.handler(null, null, null);

        expect(metricsReporting.reportFailuresInput.length).toBe(0);
    });

    test('Workflow not registered', async () => {
        metricsReporting.reset();
        metricsDb.reset();
        register.reset();
        register.listResult = ['test'];
        metricsDb.getIssueFailureCountRetval = [{ workflow: 'test' }, { workflow: 'test2' }];

        await reportMetrics.handler(null, null, null);

        expect(metricsReporting.reportFailuresInput.length).toBe(1);
        expect(metricsReporting.reportFailuresInput[0].count).toBe(1);
        expect(metricsReporting.reportFailuresInput[0].workflow).toBe('test');
    });

    test('Count returned', async () => {
        metricsReporting.reset();
        metricsDb.reset();
        register.reset();
        register.listResult = ['test'];
        metricsDb.getIssueFailureCountRetval = [{ workflow: 'test' }];

        await reportMetrics.handler(null, null, null);

        expect(metricsReporting.reportFailuresInput.length).toBe(1);
        expect(metricsReporting.reportFailuresInput[0].count).toBe(1);
        expect(metricsReporting.reportFailuresInput[0].workflow).toBe('test');
    });

    test('Count returned', async () => {
        metricsReporting.reset();
        metricsDb.reset();
        register.reset();
        register.listResult = ['test'];
        metricsDb.getIssueFailureCountRetval = [
            { workflow: 'test' },
            { workflow: 'test' },
            { workflow: 'test' },
            { workflow: 'test' },
            { workflow: 'test' },
            { workflow: 'test' },
            { workflow: 'test' },
            { workflow: 'test' },
            { workflow: 'test' },
            { workflow: 'test' },
            { workflow: 'test' }
        ];

        await reportMetrics.handler(null, null, null);

        expect(metricsReporting.reportFailuresInput.length).toBe(1);
        expect(metricsReporting.reportFailuresInput[0].count).toBe(11);
        expect(metricsReporting.reportFailuresInput[0].workflow).toBe('test');
    });
});

describe('unit-test utils', () => {
    process.env.environment = 'not unit test';
    test('setMetricsReporting', async () => {
        let error = null;
        try {
            reportMetrics.setMetricsReporting(null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('A system is trying to use a unit test capability');
    });

    test('setMetricsDb', async () => {
        let error = null;
        try {
            reportMetrics.setMetricsDb(null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('A system is trying to use a unit test capability');
    });
    test('setWorkflowRegister', async () => {
        let error = null;
        try {
            reportMetrics.setWorkflowRegister(null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('A system is trying to use a unit test capability');
    });
});

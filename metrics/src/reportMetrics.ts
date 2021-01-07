import { lambdaWrapperAsync, MetricsDb, MetricsReporting, WorkflowRegister } from '@moe-tech/orchestrator';
import { Handler } from 'aws-lambda';
import { install } from 'source-map-support';
install();

let metricsDb: MetricsDb;
let metricsReporting: MetricsReporting;
let workflowRegister: WorkflowRegister;

export function setMetricsDb (obj: MetricsDb) {
    if (process.env.environment !== 'unit-test') {
        throw new Error('A system is trying to use a unit test capability');
    }
    metricsDb = obj;
}
export function setMetricsReporting (obj: MetricsReporting) {
    if (process.env.environment !== 'unit-test') {
        throw new Error('A system is trying to use a unit test capability');
    }
    metricsReporting = obj;
}
export function setWorkflowRegister (obj: WorkflowRegister) {
    if (process.env.environment !== 'unit-test') {
        throw new Error('A system is trying to use a unit test capability');
    }
    workflowRegister = obj;
}

export const handler: Handler = lambdaWrapperAsync(async (event: any) => {
    if (!metricsReporting) {
        metricsReporting = new MetricsReporting();
    }
    if (!metricsDb) {
        metricsDb = new MetricsDb();
    }
    if (!workflowRegister) {
        workflowRegister = new WorkflowRegister(process.env.WorkflowRegistry);
    }

    const registeredWorkflows = await workflowRegister.list();
    if (!registeredWorkflows || registeredWorkflows.length === 0) {
        return;
    }
    const workflowStats = [];
    registeredWorkflows.forEach(workflow => {
        workflowStats[workflow] = {
            failures: 0
        };
    });

    const metricData = await metricsDb.getIssueFailures();
    for (const i in metricData) {
        const metric = metricData[i];
        const workflow = workflowStats[metric.workflow];
        if (!workflow) {
            continue;
        }
        workflow.failures++;
    }

    for (const i in workflowStats) {
        await metricsReporting.reportFailures(i, workflowStats[i].failures);
    }

    return event;
});

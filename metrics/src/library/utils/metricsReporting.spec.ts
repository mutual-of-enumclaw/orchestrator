import { MetricsReporting } from './metricsReporting';
import { MockCloudwatch } from '../__mock__/aws';

const cloudwatch = new MockCloudwatch();
const reporting = new MetricsReporting();

describe('handler', () => {
  reporting.cloudwatch = cloudwatch as any;

  test('No workflow specified', async () => {
    cloudwatch.reset();
    let error = null;
    try {
      await reporting.reportFailures('', 0);
    } catch (err) {
      error = err.message;
    }
    expect(error).toBe('Parameter workflow not specified');
    expect(cloudwatch.called).toBe(0);
  });

  test('Null db result', async () => {
    cloudwatch.reset();

    await reporting.reportFailures('workflow param', 0);

    expect(cloudwatch.called).toBe(1);
    expect(cloudwatch.putMetricParams.MetricData[0].Value).toBe(0);
    expect(cloudwatch.putMetricParams.MetricData[0].Dimensions[1].Name).toBe('Workflow');
    expect(cloudwatch.putMetricParams.MetricData[0].Dimensions[1].Value).toBe('workflow param');
  });

  test('1 Count returned', async () => {
    cloudwatch.reset();

    await reporting.reportFailures('workflow param', 1);

    expect(cloudwatch.called).toBe(1);
    expect(cloudwatch.putMetricParams.MetricData[0].Value).toBe(1);
    expect(cloudwatch.putMetricParams.MetricData[0].Dimensions[1].Name).toBe('Workflow');
    expect(cloudwatch.putMetricParams.MetricData[0].Dimensions[1].Value).toBe('workflow param');
  });

  test('15 Count returned', async () => {
    cloudwatch.reset();

    await reporting.reportFailures('workflow param', 15);

    expect(cloudwatch.called).toBe(1);
    expect(cloudwatch.putMetricParams.MetricData[0].Value).toBe(15);
    expect(cloudwatch.putMetricParams.MetricData[0].Dimensions[1].Name).toBe('Workflow');
    expect(cloudwatch.putMetricParams.MetricData[0].Dimensions[1].Value).toBe('workflow param');
  });
});

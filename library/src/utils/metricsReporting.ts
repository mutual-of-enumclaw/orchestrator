import * as AWS from 'aws-sdk';

export class MetricsReporting {
    cloudwatch = new AWS.CloudWatch();
    public async reportFailures (workflow: string, failureCount: number) {
        if (!workflow) {
            throw new Error('Parameter workflow not specified');
        }

        await this.cloudwatch.putMetricData({
            MetricData: [
                {
                    MetricName: process.env.metric,
                    Dimensions: [
                        {
                            Name: 'Environment',
                            Value: process.env.environment
                        },
                        {
                            Name: 'Workflow',
                            Value: workflow
                        }
                    ],
                    Unit: 'Count',
                    Value: failureCount
                }
            ],
            Namespace: process.env.metricNamespace
        }).promise();
    }
}

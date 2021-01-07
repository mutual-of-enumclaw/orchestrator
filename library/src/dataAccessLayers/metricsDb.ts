import * as AWS from 'aws-sdk';

export class MetricsDb {
    dynamoDb: AWS.DynamoDB.DocumentClient;
    constructor (dynamoDal?: AWS.DynamoDB.DocumentClient) {
        this.dynamoDb = dynamoDal || new AWS.DynamoDB.DocumentClient();
    }

    public async putIssueFailure (workflow: string, uid: string) {
        const timeout = (new Date().getTime() + (1000 * 60 * 15)) / 1000;
        await this.dynamoDb.put({
            TableName: process.env.metricsTable,
            Item: {
                uid,
                workflow,
                timeout
            }
        }).promise();
    }

    public async getIssueFailures () {
        const metricData = await this.dynamoDb.scan({
            TableName: process.env.metricsTable
        }).promise();

        if (!metricData || !metricData.Items) {
            return [];
        }

        return metricData.Items;
    }
}

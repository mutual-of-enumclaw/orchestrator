/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import * as AWS from 'aws-sdk';

export class PluginManagementDal {
    private dal: AWS.DynamoDB.DocumentClient;
    constructor(private pluginTable: string, private orchestratorId: string, public stage: string) {
        this.dal = new AWS.DynamoDB.DocumentClient();
    }

    
    public async getPlugin(functionName: string) {
        const result = await this.dal.query({
            TableName: this.pluginTable,
            KeyConditionExpression: 'orchestratorId = :orchId',
            FilterExpression: 'functionName = :func',
            ExpressionAttributeValues: {
                ':orchId': `${this.orchestratorId}|${this.stage}`,
                ':func': functionName
            }
        }).promise();

        if(!result || !result.Count) {
            return null;
        }

        return result.Items[0];
    }

    public async addPlugin(subscriptionArn: string, 
                           params: {functionName: string, pluginName: string, mandatory: boolean, order: number}) {
        await this.dal.put({
            TableName: this.pluginTable,
            Item: {
                orchestratorId: `${this.orchestratorId}|${this.stage}`,
                subscriptionArn,
                ...params
            }
        }).promise();
    }
    public async removePlugin(subscriptionArn: string) {
        await this.dal.delete({
            TableName: this.pluginTable,
            Key: {
                orchestratorId: `${this.orchestratorId}|${this.stage}`,
                subscriptionArn
            }
        }).promise();
    }
}

/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { DynamoDB, Lambda } from 'aws-sdk';
import { OrchestratorSyncPlugin } from '../types';

export interface PluginStorageDefinition {
    orchestratorId: string;
    subscriptionArn: string;
    functionName: string;
    pluginName: string;
    mandatory: boolean;
    order: number;
}

const dynamodb = new DynamoDB.DocumentClient();
const lambda = new Lambda();

export class PluginManagementDal {
    constructor (private pluginTable: string) {
    }

    public async getPluginBySubscription (subscriptionArn: string): Promise<PluginStorageDefinition> {
        const results = await dynamodb.scan({
            TableName: process.env.pluginTable,
            FilterExpression: '#subscriptionArn = :subscriptionArn',
            ExpressionAttributeNames: {
                '#subscriptionArn': 'subscriptionArn'
            },
            ExpressionAttributeValues: {
                ':subscriptionArn': subscriptionArn
            }
        }).promise();

        return results.Count === 0 ? undefined : results.Items[0] as PluginStorageDefinition;
    }

    public async getPluginByFunction (functionName: string): Promise<PluginStorageDefinition[]> {
        const functionQuery = await dynamodb.query({
            TableName: process.env.pluginTable,
            IndexName: 'FunctionIndex',
            FilterExpression: '#functionName = :functionName',
            ExpressionAttributeNames: {
                '#functionName': 'functionName'
            },
            ExpressionAttributeValues: {
                ':functionName': functionName
            }
        }).promise();

        return functionQuery.Items as PluginStorageDefinition[];
    }

    public async getPlugin (orchestratorId: string, stage: string, functionName: string): Promise<PluginStorageDefinition> {
        const result = await dynamodb.query({
            TableName: this.pluginTable,
            KeyConditionExpression: 'orchestratorId = :orchId',
            FilterExpression: 'functionName = :func',
            ExpressionAttributeValues: {
                ':orchId': `${orchestratorId}|${stage}`,
                ':func': functionName
            }
        }).promise();

        if (!result || !result.Count) {
            return null;
        }

        return result.Items[0] as PluginStorageDefinition;
    }

    public async addPlugin (orchestratorId: string,
        stage: string,
        subscriptionArn: string,
        params: {functionName: string, pluginName: string, mandatory: boolean, order: number}) {
        await dynamodb.put({
            TableName: this.pluginTable,
            Item: {
                orchestratorId: `${orchestratorId}|${stage}`,
                subscriptionArn,
                ...params
            }
        }).promise();
    }

    public async removePlugin (orchestratorId: string, stage: string, subscriptionArn: string) {
        await dynamodb.delete({
            TableName: this.pluginTable,
            Key: {
                orchestratorId: `${orchestratorId}|${stage}`,
                subscriptionArn
            }
        }).promise();
    }

    public async getPluginConfig (item: PluginStorageDefinition): Promise<PluginStorageDefinition> {
        console.log('Invoking Lambda');
        const lambdaResult = await lambda.invoke({
            FunctionName: item.functionName,
            Payload: JSON.stringify({
                Records: [
                    {
                        Sns: {
                            Message: JSON.stringify({ initialize: true })
                        }
                    }
                ]
            }),
            InvocationType: 'RequestResponse'
        }).promise();
        console.log('Response retrieved', lambdaResult);

        if (!lambdaResult) {
            throw new Error(`An error occured while initializing lambda (${item.functionName})`);
        }
        if (lambdaResult.FunctionError) {
            throw new Error(lambdaResult.FunctionError.toString());
        }

        const body = (lambdaResult.Payload) ? lambdaResult.Payload.toString() : '{}';
        console.log('Parsing payload: ' + body);
        console.log(body);
        let result: OrchestratorSyncPlugin;
        try {
            result = (body) ? JSON.parse(body) : {};
            if (result['default'] && result['default'].mandatory !== undefined) {
                result.mandatory = result['default'].mandatory;
                result.pluginRegisterTimeout = result['default'].pluginRegisterTimeout;
                delete result['default'];
            }
            if (result.mandatory === undefined) {
                result.mandatory = true;
            }
        } catch (err) {
            console.log(`An error occured parsing the install result for ${item.functionName}. Using default values`, err);
            result = {} as OrchestratorSyncPlugin;
        }

        if (result.order === undefined || result.order === null) {
            result.order = Math.floor(Math.random() * 10) + 90;
        }

        return {
            orchestratorId: item.orchestratorId,
            functionName: item.functionName,
            subscriptionArn: item.subscriptionArn,
            ...result
        };
    }
}

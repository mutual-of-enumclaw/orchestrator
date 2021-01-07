/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { DynamoDB } from 'aws-sdk';
import { OrchestratorStage, OrchestratorSyncPlugin } from '../types';

export class OrchestratorPluginDal {
    private dal: DynamoDB.DocumentClient = new DynamoDB.DocumentClient();
    constructor (private pluginTable: string, private orchestratorId: string) {
    }

    public async getPlugins (stage: OrchestratorStage) : Promise<Array<OrchestratorSyncPlugin>> {
        if (stage === null || stage === undefined) {
            throw new Error('Argument stage not defined');
        }
        const results = await this.dal.query(
            {
                TableName: this.pluginTable,
                ExpressionAttributeValues: {
                    ':id': `${this.orchestratorId}|${stage}`
                },
                KeyConditionExpression: 'orchestratorId = :id'
            }).promise();

        if (results == null || !results.Items || results.Items.length === 0) {
            return [];
        }
        results.Items.sort((a, b) => {
            if (a.order === undefined) {
                a.order = 90;
            }
            if (b.order === undefined) {
                b.order = 90;
            }
            return a.order - b.order;
        });
        return results.Items as OrchestratorSyncPlugin[];
    }
}

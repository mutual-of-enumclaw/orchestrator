/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { DynamoDB } from 'aws-sdk';
import { getConfig } from '../utils/config';
import { OrchestratorComponentState, OrchestratorStage, OrchestratorWorkflowStatus } from '../types';

export class OrchestratorStatusDal {
    private dal: DynamoDB.DocumentClient = new DynamoDB.DocumentClient();

    public async getStatusObject (uid: string,
        workflow: string,
        consistentRead?: boolean): Promise<OrchestratorWorkflowStatus> {
        if (!uid) {
            throw new Error('No id specified');
        }
        if (!workflow) {
            throw new Error('No activity specified');
        }
        const result = await this.dal.get({
            TableName: getConfig().statusTable,
            Key: { uid, workflow },
            ConsistentRead: consistentRead
        }).promise();
        return result.Item as OrchestratorWorkflowStatus;
    }

    public async updatePluginStatus (
        uid: string, workflow: string, activity: string, stage: OrchestratorStage,
        mandatory: boolean, pluginName: string, state: OrchestratorComponentState,
        message: string) {
        const type = mandatory ? 'mandatory' : 'optional';
        const status = {
            state,
            message: message?.substr(0, 180)
        };
        if (!message) {
            delete status.message;
        }

        console.log('uid: ', JSON.stringify(uid));
        console.log('workflow: ', JSON.stringify(workflow));
        console.log('activity: ', JSON.stringify(activity));
        console.log('stage: ', JSON.stringify(stage));
        console.log('mandatory: ', JSON.stringify(mandatory));
        console.log('pluginName: ', JSON.stringify(pluginName));
        console.log('state: ', JSON.stringify(state));
        console.log('message: ', JSON.stringify(message));

        const params = {
            TableName: getConfig().statusTable,
            Key: { uid, workflow },
            UpdateExpression: 'set #activities.#activity.#stage.#type.#pluginName = :status',
            ExpressionAttributeNames: {
                '#activities': 'activities',
                '#activity': activity,
                '#stage': stage,
                '#type': type,
                '#pluginName': pluginName
            },
            ExpressionAttributeValues: {
                ':status': status
            }
        };

        await this.dal.update(params).promise();
    }

    public async updateStageStatus (
        uid: string, workflow: string, activity: string, stage: OrchestratorStage,
        state: OrchestratorComponentState, message: string, updateTime: Date = new Date(), token: string = '') {
        const params = {
            TableName: getConfig().statusTable,
            Key: { uid, workflow },
            UpdateExpression: 'set #activities.#activity.#stage.#status.#state = :state' +
                ', #activities.#activity.#stage.#status.#message = :message' +
                ', #activities.#activity.#stage.#status.#startTime = :startTime',
            ExpressionAttributeNames: {
                '#activities': 'activities',
                '#activity': activity,
                '#stage': stage,
                '#status': 'status',
                '#state': 'state',
                '#message': 'message',
                '#startTime': 'startTime'
            },
            ExpressionAttributeValues: {
                ':state': state,
                ':message': message,
                ':startTime': updateTime.toString()
            }
        };

        if (token) {
            params.UpdateExpression += ', #activities.#activity.#stage.#status.#token = :token';
            params.ExpressionAttributeNames['#token'] = 'token';
            params.ExpressionAttributeValues[':token'] = token;
        }

        await this.dal.update(params).promise();

        //
        // Perform consistent read after write to make sure we dont
        // collide with later update
        //
        await this.dal.get({
            TableName: getConfig().statusTable,
            Key: { uid, workflow },
            ConsistentRead: true
        }).promise();
    }
}

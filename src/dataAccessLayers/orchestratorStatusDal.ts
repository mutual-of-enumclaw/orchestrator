/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import {
    OrchestratorStatus, OrchestratorComponentState, OrchestratorSyncPlugin,
    OrchestratorStage,
    OrchestratorWorkflowStatus
} from '..';
import { PromiseResult } from 'aws-sdk/lib/request';
import { PutItemOutput, DocumentClient } from 'aws-sdk/clients/dynamodb';
import { AWSError } from 'aws-sdk';

export class OrchestratorStatusDal {
    private dal: DocumentClient = new DocumentClient();
    constructor(private statusTable: string, private orchestratorId: string) {
    }

    public async getStatusObject(
        uid: string,
        workflow: string,
        consistentRead: boolean = false): Promise<OrchestratorWorkflowStatus> {
        if (!uid) {
            throw new Error('No id specified');
        }
        if (!workflow) {
            throw new Error('No activity specified');
        }
        const result = await this.dal.get({
            TableName: this.statusTable,
            Key: { uid, workflow },
            ConsistentRead: consistentRead
        }).promise();

        if (!(result && result.Item)) {
            return undefined;
        }
        return result.Item as OrchestratorWorkflowStatus;
    }

    public async updatePluginStatus(
        uid: string, workflow: string, activity: string, stage: OrchestratorStage,
        mandatory: boolean, pluginName: string, state: OrchestratorComponentState,
        message: string) {
        const type = mandatory ? 'mandatory' : 'optional';
        const status = {
            state,
            message
        };
        if (!message) {
            delete status.message;
        }

        console.log("uid: ", JSON.stringify(uid));
        console.log("workflow: ", JSON.stringify(workflow));
        console.log("activity: ", JSON.stringify(activity));
        console.log("stage: ", JSON.stringify(stage));
        console.log("mandatory: ", JSON.stringify(mandatory));
        console.log("pluginName: ", JSON.stringify(pluginName));
        console.log("state: ", JSON.stringify(state));
        console.log("message: ", JSON.stringify(message));

        const params = {
            TableName: this.statusTable,
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
            },
        };

        await this.dal.update(params).promise();
    }

    public async updateStageStatus(
        uid: string, workflow: string, activity: string, stage: OrchestratorStage,
        state: OrchestratorComponentState, message: string) {
        const params = {
            TableName: this.statusTable,
            Key: { uid, workflow },
            UpdateExpression: 'set #activities.#activity.#stage.#status.#state = :state' +
                ', #activities.#activity.#stage.#status.#message = :message',
            ExpressionAttributeNames: {
                '#activities': 'activities',
                '#activity': activity,
                '#stage': stage,
                '#status': 'status',
                '#state': 'state',
                '#message': 'message'
            },
            ExpressionAttributeValues: {
                ':state': state,
                ':message': message
            },
        };

        await this.dal.update(params).promise();

        //
        // Perform consistent read after write to make sure we dont
        // collide with later update
        //
        this.getStatusObject(uid, workflow, true);
    }

    public async putInitialWorkflowStatus(event: OrchestratorWorkflowStatus)
        : Promise<PromiseResult<PutItemOutput, AWSError>> {
        return this.dal.put({
            TableName: this.statusTable,
            Item: event
        }).promise();
    }
}

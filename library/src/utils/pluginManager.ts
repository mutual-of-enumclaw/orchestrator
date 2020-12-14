/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { PluginManagementDal } from "./pluginManagementDal";
import { OrchestratorStage, OrchestratorSyncPlugin } from "@moe-tech/orchestrator";
import { CloudwatchEvent } from "../types/cloudwatchEvent";
import { Lambda } from 'aws-sdk';
import { Stage } from "aws-sdk/clients/amplify";

interface LambdaResult {
    pluginName: string;
    mandatory: boolean;
    order: number;
}

export class PluginManager {
    public pluginDal: PluginManagementDal;
    private lambda: Lambda;

    constructor(private activity: string, private stage: OrchestratorStage, private snsArn: string) {}

    public async removePluginEvent(event: CloudwatchEvent) {
        this.evaluateCloudwatchEvent(event);
        if(!event.detail.requestParameters.subscriptionArn) {
            throw new Error('No subscription arn supplied');
        }
        const subscriptionArn = event.detail.requestParameters.subscriptionArn;
        if(!subscriptionArn.startsWith(this.snsArn + ':')) {
            console.log('The subscription does not apply to this sns topic');
            return;
        }

        await this.pluginDal.removePlugin(subscriptionArn);
    }

    public async addPluginEvent(event: CloudwatchEvent) : Promise<void> {
        this.evaluateCloudwatchEvent(event);
        
        if(!event.detail.requestParameters.topicArn) {
            throw new Error('Argument event topic not valid');
        }
        if(!event.detail.requestParameters.protocol) {
            throw new Error('Argument event protocol not valid');
        }
        if(!event.detail.requestParameters.protocol || event.detail.requestParameters.protocol !== 'lambda') {
            throw new Error('Argument event protocol not valid');
        }
        if(!event.detail.requestParameters.endpoint) {
            throw new Error('Argument event lambda arn not valid');
        }

        console.log('Getting lambda name');
        const lambdaArnParts = event.detail.requestParameters.endpoint.split(':');
        if(lambdaArnParts.length < 7) {
            throw new Error('Argument event lambda arn malformed');
        }
        const lambdaName = lambdaArnParts[6];
        console.log('Lambda Name: ' + lambdaName);

        await this.updateLambdaParams(lambdaName, event.detail.responseElements.subscriptionArn, this.stage);
    }

    public async updateLambdaParams(lambdaName: string, subscriptionArn: string, stage: Stage) {
        if(!this.pluginDal) {
            this.pluginDal = new PluginManagementDal(process.env.pluginTable, this.activity, this.stage);
            this.lambda = new Lambda();
        }
        const pluginDal = this.pluginDal.stage === stage? this.pluginDal : 
                                    new PluginManagementDal(process.env.pluginTable, this.activity, stage);
        console.log('Invoking Lambda');
        const lambdaResult = await this.lambda.invoke({
            FunctionName: lambdaName,
            Payload: JSON.stringify({
                    Records: [
                        {
                            Sns: {
                                Message: JSON.stringify({"initialize": true})
                            }
                        }
                    ]
                }),
            InvocationType: 'RequestResponse'
        }).promise();
        console.log('Response retrieved', lambdaResult);

        if(!lambdaResult) {
            throw new Error(`An error occured while initializing lambda (${lambdaName})`);
        }
        if(lambdaResult.FunctionError) {
            throw new Error(lambdaResult.FunctionError.toString());
        }

        const body = (lambdaResult.Payload)? lambdaResult.Payload.toString() : '{}';
        console.log('Parsing payload: ' + body);
        console.log(body);
        let result: OrchestratorSyncPlugin;
        try {
            result = (body)? JSON.parse(body) : {};
            if(result['default'] && result['default'].mandatory !== undefined) {
                result.mandatory = result['default'].mandatory;
                result.pluginRegisterTimeout = result['default'].pluginRegisterTimeout;
                delete result['default'];
            }
            if(result.mandatory === undefined) {
                result.mandatory = true;
            }
        } catch (err) {
            console.log(`An error occured parsing the install result for ${lambdaName}. Using default values`, err);
            result = {} as OrchestratorSyncPlugin;
        }

        if(result.order === undefined || result.order === null) {
            result.order = Math.floor(Math.random() * 10) + 90;
        }

        console.log('Adding plugin to database');
        await pluginDal.addPlugin(subscriptionArn, 
                                  {functionName: lambdaName, ...result});
        console.log('Plugin add succeeded');
    }

    public evaluateCloudwatchEvent(event: CloudwatchEvent) {
        if(!event || !event.detail || !event.detail.requestParameters) {
            throw new Error('Argument event not valid');
        }
        if(!this.pluginDal) {
            this.pluginDal = new PluginManagementDal(process.env.pluginTable, this.activity, this.stage);
            this.lambda = new Lambda();
        }
    }
}

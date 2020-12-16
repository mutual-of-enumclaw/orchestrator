/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { CloudwatchEvent, OrchestratorStage } from '../types';
import { MockPluginManagementDal } from '../__mock__/dals';
import { MockLambda } from '../__mock__/aws';

const pluginDal = new MockPluginManagementDal();
const lambda = new MockLambda();

const snsArn = 'arn:aws:sns:us-west-2:000000000000:nucleus-plugin-management-dev-alert';

import { PluginManager } from './pluginManager';
const pluginManager = new PluginManager('test', OrchestratorStage.PreProcessing, snsArn);

describe('removePluginEvent', () => {
    beforeEach(() => {
        pluginDal.reset();
        lambda.reset();
    });
    test('Null event', async () => {
        let error = null;
        try {
            await pluginManager.removePluginEvent(null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Argument event not valid');
    });

    test('Event missing topic arn', async () => {
        let error = null;
        const event = getUnsubscribeEvent();
        event.detail.requestParameters.subscriptionArn = '';
        try {
            await pluginManager.removePluginEvent(event);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('No subscription arn supplied');
    });
    test('SNS arn does not match', async () => {
        lambda.invokeRetval = { order: 1 };
        const event = getUnsubscribeEvent();
        event.detail.requestParameters.subscriptionArn = snsArn + '-test:subscriptiondetails';
        await pluginManager.removePluginEvent(event);

        expect(pluginDal.removePluginInput.length).toBe(0);
    });
    test('Removing event to pre stage', async () => {
        lambda.invokeRetval = { order: 1 };
        const event = getUnsubscribeEvent();
        await pluginManager.removePluginEvent(event);

        expect(pluginDal.removePlugin).toBeCalledTimes(1);
        expect(pluginDal.removePlugin).toBeCalledWith(event.detail.requestParameters.subscriptionArn);
    });
});

describe('processCloudwatchEvent', () => {
    beforeEach(() => {
        pluginDal.reset();
        lambda.reset();
    });

    test('Null event', async () => {
        let error = null;
        try {
            await pluginManager.addPluginEvent(null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Argument event not valid');
    });

    test('Event missing topic arn', async () => {
        let error = null;
        const event = getSubscribeEvent();
        event.detail.requestParameters.topicArn = '';
        try {
            await pluginManager.addPluginEvent(event);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Argument event topic not valid');
    });
    test('Event missing protocol', async () => {
        let error = null;
        const event = getSubscribeEvent();
        event.detail.requestParameters.protocol = '';
        try {
            await pluginManager.addPluginEvent(event);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Argument event protocol not valid');
    });
    test('Event not lambda protocol', async () => {
        let error = null;
        const event = getSubscribeEvent();
        event.detail.requestParameters.protocol = 'email';
        try {
            await pluginManager.addPluginEvent(event);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Argument event protocol not valid');
    });
    test('Event missing lambda arn', async () => {
        let error = null;
        const event = getSubscribeEvent();
        event.detail.requestParameters.endpoint = '';
        try {
            await pluginManager.addPluginEvent(event);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Argument event lambda arn not valid');
    });
    test('Event bad lambda arn', async () => {
        let error = null;
        const event = getSubscribeEvent();
        event.detail.requestParameters.endpoint = 'arn:aws:bad:arn';
        try {
            await pluginManager.addPluginEvent(event);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Argument event lambda arn malformed');
    });
    test('Adding event to pre stage', async () => {
        lambda.invokeRetval = { Payload: '{ "pluginName": "Test", "mandatory": true, "order": 1}' };
        const event = getSubscribeEvent();
        event.detail.requestParameters.topicArn += '-pre';
        pluginDal['stage'] = 'pre';
        await pluginManager.addPluginEvent(event);

        expect(pluginDal.addPlugin).toBeCalledTimes(1);
        expect(pluginDal.addPluginInput[0].functionName).toBe('nucleus-plugin-management-dev-test2');
        expect(pluginDal.addPluginInput[0].order).toBe(1);
        expect(lambda.invokeParams.length).toBe(1);
        expect(lambda.invokeParams[0].FunctionName).toBe('nucleus-plugin-management-dev-test2');
    });
    test('Adding event to pre stage no order', async () => {
        lambda.invokeRetval = { Payload: '{}'};
        const event = getSubscribeEvent();
        pluginDal['stage'] = 'pre';
        await pluginManager.addPluginEvent(event);

        expect(pluginDal.addPluginInput.length).toBe(1);
        expect(pluginDal.addPluginInput[0].functionName).toBe('nucleus-plugin-management-dev-test2');
        expect(pluginDal.addPluginInput[0].order).toBeGreaterThan(89);
        expect(pluginDal.addPluginInput[0].order).toBeLessThan(101);
        expect(lambda.invokeParams.length).toBe(1);
        expect(lambda.invokeParams[0].FunctionName).toBe('nucleus-plugin-management-dev-test2');
    });

    test('Malformed payload', async () => {
        lambda.invokeRetval = { Payload: 'order: 1'};
        const event = getSubscribeEvent();
        pluginDal['stage'] = 'pre';
        await pluginManager.addPluginEvent(event);

        expect(pluginDal.addPluginInput.length).toBe(1);
        expect(pluginDal.addPluginInput[0].functionName).toBe('nucleus-plugin-management-dev-test2');
        expect(pluginDal.addPluginInput[0].order).toBeGreaterThan(89);
        expect(pluginDal.addPluginInput[0].order).toBeLessThan(101);
        expect(lambda.invokeParams.length).toBe(1);
        expect(lambda.invokeParams[0].FunctionName).toBe('nucleus-plugin-management-dev-test2');
    });

    test('No payload', async () => {
        lambda.invokeRetval = { };
        pluginDal['stage'] = 'pre';
        const event = getSubscribeEvent();
        await pluginManager.addPluginEvent(event);

        expect(pluginDal.addPluginInput.length).toBe(1);
        expect(pluginDal.addPluginInput[0].functionName).toBe('nucleus-plugin-management-dev-test2');
        expect(pluginDal.addPluginInput[0].order).toBeGreaterThan(89);
        expect(pluginDal.addPluginInput[0].order).toBeLessThan(101);
        expect(lambda.invokeParams.length).toBe(1);
        expect(lambda.invokeParams[0].FunctionName).toBe('nucleus-plugin-management-dev-test2');
    });

    test('Lambda failure', async () => {
        lambda.invokeRetval = { FunctionError: 'Test'};
        const event = getSubscribeEvent();
        let error = null;
        try {
            await pluginManager.addPluginEvent(event);
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('Test');
        expect(pluginDal.addPluginInput.length).toBe(0);
        expect(lambda.invokeParams.length).toBe(1);
        expect(lambda.invokeParams[0].FunctionName).toBe('nucleus-plugin-management-dev-test2');
    });
});

function getUnsubscribeEvent() : CloudwatchEvent {
    return {
        "version": "0",
        "id": "c021ae83-21dc-4eb0-2ca4-c6c9e7e8c6a7",
        "detail-type": "AWS API Call via CloudTrail",
        "source": "aws.sns",
        "account": "000000000000",
        "time": "2019-02-05T00:12:12Z",
        "region": "us-west-2",
        "resources": [],
        "detail": {
            "eventVersion": "1.05",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAIZOM6ZVJTAD37TQWO:nkeating@mutualofenumclaw.com",
                "arn": "arn:aws:sts::000000000000:assumed-role/SandBoxAdmin/nkeating@mutualofenumclaw.com",
                "accountId": "000000000000",
                "accessKeyId": "ASIAQL6K774NYWRIJN5H",
                "sessionContext": {
                    "attributes": {
                        "mfaAuthenticated": "false",
                        "creationDate": "2019-02-04T16:47:13Z"
                    },
                    "sessionIssuer": {
                        "type": "Role",
                        "principalId": "AROAIZOM6ZVJTAD37TQWO",
                        "arn": "arn:aws:iam::000000000000:role/SandBoxAdmin",
                        "accountId": "000000000000",
                        "userName": "SandBoxAdmin"
                    }
                }
            },
            "eventTime": "2019-02-05T00:12:12Z",
            "eventSource": "sns.amazonaws.com",
            "eventName": "Unsubscribe",
            "awsRegion": "us-west-2",
            "sourceIPAddress": "50.206.106.129",
            "requestParameters": {
                "subscriptionArn": 
                        snsArn + 
                        ":c3019def-3714-403e-ba29-eb14079d5c69"
            },
            "responseElements": null,
            "requestID": "49d924a6-4353-54f8-b698-70749448974c",
            "eventID": "1338bf78-9583-4f79-ad29-82b689b50d32",
            "eventType": "AwsApiCall"
        }
    } as any;
}

function getSubscribeEvent() : CloudwatchEvent {
    return {
        "version": "0",
        "id": "58274b74-e7de-1ea9-65d6-ea1289e4173d",
        "detail-type": "AWS API Call via CloudTrail",
        "source": "aws.sns",
        "account": "000000000000",
        "time": "2019-02-04T17:02:56Z",
        "region": "us-west-2",
        "resources": [],
        "detail": {
            "eventVersion": "1.05",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAJTW3HGEWFOVWAVXL2",
                "arn": "arn:aws:iam::000000000000:user/nkeating",
                "accountId": "000000000000",
                "accessKeyId": "ASIAIENF7ODZIPDF7H7Q",
                "userName": "nkeating",
                "sessionContext": {
                    "attributes": {
                        "mfaAuthenticated": "false",
                        "creationDate": "2019-02-04T17:02:47Z"
                    }
                },
                "invokedBy": "cloudformation.amazonaws.com"
            },
            "eventTime": "2019-02-04T17:02:56Z",
            "eventSource": "sns.amazonaws.com",
            "eventName": "Unsubscribe",
            "awsRegion": "us-west-2",
            "sourceIPAddress": "cloudformation.amazonaws.com",
            "userAgent": "cloudformation.amazonaws.com",
            "requestParameters": {
                "returnSubscriptionArn": true,
                "topicArn": "arn:aws:sns:us-west-2:000000000000:nucleus-plugin-management-dev-alert",
                "protocol": "lambda",
                "endpoint": "arn:aws:lambda:us-west-2:000000000000:function:nucleus-plugin-management-dev-test2"
            },
            "responseElements": {
                "subscriptionArn": 
        "arn:aws:sns:us-west-2:000000000000:nucleus-plugin-management-dev-alert:149f669e-23c4-45a1-9640-c58da354e67c"
            },
            "requestID": "ab372051-6dd7-5186-b338-74831f5763ad",
            "eventID": "c878eea2-3051-4a45-8349-9af6864306f9",
            "eventType": "AwsApiCall"
        }
    } as any;
}

/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { OrchestratorComponentState, OrchestratorPluginDal, OrchestratorStatusDal, SNSUtils } from '@moe-tech/orchestrator';
import { MockSNSUtils } from '@moe-tech/orchestrator/__mock__/libServices';
import { MockOrchestratorStatusDal, MockOrchestratorPluginDal } from '@moe-tech/orchestrator/__mock__/dals';
import { MockStepFunctions } from '@moe-tech/orchestrator/__mock__/aws';
import { StepFunctions } from 'aws-sdk';

process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'TestStatusTable' });
process.env.snsTopic = 'testTopic';
process.env.statusTable = 'TestStatusTable';
process.env.pluginTable = 'TestPluginTable';
process.env.activity = 'test';

const sns = new MockSNSUtils(SNSUtils);
const dal = new MockOrchestratorStatusDal(OrchestratorStatusDal);
const pluginDal = new MockOrchestratorPluginDal(OrchestratorPluginDal);
const stepfunctions = new MockStepFunctions(StepFunctions);

import { fanOut } from './parallelStart';

describe('fanOut', () => {
    beforeAll(() => {
    });
    beforeEach(() => {
        pluginDal.reset();
        stepfunctions.reset();
        sns.reset();
        dal.reset();
    });

    test('Null Event', async () => {
        let error = null;
        try {
            await fanOut({ data: null, asyncToken: 'token' });
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('Async event data not recieved');
    });

    test('No uid', async () => {
        let error = null;
        try {
            await fanOut({ data: {}, asyncToken: 'token' });
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe("Event data unexpected (uid: 'undefined')");
    });
    test('SNS Subscription is 0', async () => {
        sns.subscriberCount = 0;
        const result = await fanOut(getDefaultEvent());

        expect(result).toBe(OrchestratorComponentState.Complete);
        expect(dal.getStatusObjectInput).toBeDefined();
    });
    test('SNS Subscription is 1', async () => {
        sns.subscriberCount = 1;
        dal.getStatusObjectResult = {
            activities: {
                test: {
                    async: {
                        mandatory: {},
                        optional: {},
                        status: {
                            state: OrchestratorComponentState.InProgress
                        }
                    },
                    pluginRegisterTimeout: 10
                }
            }
        };
        pluginDal.getPluginsResults = [{}];
        const result = await fanOut(getDefaultEvent());

        expect(result).toBe(OrchestratorComponentState.InProgress);
        expect(dal.getStatusObject).toBeCalled();
    });
    test('No Overall Status Object', async () => {
        dal.getStatusObjectResult = null;
        let error = null;
        pluginDal.getPluginsResults = [{}];
        try {
            await fanOut(getDefaultEvent());
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('The status object cannot be found');
    });
    test('No Sub-Status Object', async () => {
        dal.getStatusObjectResult = {
            activities: {}
        };
        let error = null;
        pluginDal.getPluginsResults = [{}];
        try {
            await fanOut(getDefaultEvent());
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('The orchistration id has not been provisioned');
    });
});

function getDefaultEvent () {
    return {
        data: {
            uid: 'uid',
            workflow: 'issue',
            company: 'company',
            lineOfBusiness: 'lob',
            riskState: 'state',
            effectiveDate: 1,
            policies: [{ id: 'test' }],
            metadata: {
                workflow: 'issue'
            }
        },
        asyncToken: 'token'
    };
}

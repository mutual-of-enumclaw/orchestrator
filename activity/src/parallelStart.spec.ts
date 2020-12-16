/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { OrchestratorComponentState } from '@moe-tech/orchestrator';
import { MockSNSUtils, MockOrchestratorStatusDal, MockOrchestratorPluginDal } from '@moe-tech/orchestrator/__mock__/libServices';
import { MockStepFunctions } from '@moe-tech/orchestrator/__mock__/aws';

const sns = new MockSNSUtils();
const dal = new MockOrchestratorStatusDal();
const pluginDal = new MockOrchestratorPluginDal();
const stepfunctions = new MockStepFunctions();

import { fanOut } from './parallelStart';

describe('fanOut', () => {
    process.env.environment = 'unit-test';

    beforeEach(() => {
        pluginDal.reset();
        stepfunctions.reset();
    });
    
    test('Null Event', async () => {
        let error = null;
        try {
            await fanOut({ data: null, asyncToken: 'token'});
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('Async event data not recieved');
    });

    test('No uid', async () => {
        let error = null;
        try {
            await fanOut({ data: {}, asyncToken: 'token'});
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe("Event data unexpected (uid: 'undefined')");
    });
    test('SNS Subscription is 0', async () => {
        sns.reset();
        dal.reset();
        sns.subscriberCount = 0;
        const result = await fanOut(getDefaultEvent());

        expect(result).toBe(OrchestratorComponentState.Complete);
        expect(dal.getStatusObjectInput).toBeDefined();
    });
    test('SNS Subscription is 1', async () => {
        sns.reset();
        dal.reset();
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
            },
        };
        const result = await fanOut(getDefaultEvent());

        expect(result).toBe(OrchestratorComponentState.InProgress);
        expect(dal.getStatusObjectInput).toBeDefined();
    });
    test('No Overall Status Object', async () => {
        sns.reset();
        dal.reset();
        dal.getStatusObjectResult = null;
        let error = null;
        try {
            await fanOut(getDefaultEvent());
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('The status object cannot be found');
    });
    test('No Sub-Status Object', async () => {
        sns.reset();
        dal.reset();
        dal.getStatusObjectResult = {
            activities: {}
        };
        let error = null;
        try {
            await fanOut(getDefaultEvent());
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('The orchistration id has not been provisioned');
    });
});

function getDefaultEvent() {
    return {
        data: {
            uid: 'uid', workflow: 'issue', company: 'company', lineOfBusiness: 'lob', riskState: 'state',
            effectiveDate: 1, policies: [{ id: 'test' }], metadata: {
                workflow: 'issue'
            }
        },
        asyncToken: 'token'
    };
}

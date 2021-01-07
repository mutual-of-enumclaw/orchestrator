/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { MockOrchestratorPluginDal, MockOrchestratorStatusDal } from '@moe-tech/orchestrator/__mock__/dals';
import { MockLambda } from '@moe-tech/orchestrator/__mock__/aws';
import { OrchestratorStatusDal, OrchestratorPluginDal, OrchestratorComponentState } from '@moe-tech/orchestrator';
import { Lambda } from 'aws-sdk';

process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'TestStatusTable' });

const dal = new MockOrchestratorStatusDal(OrchestratorStatusDal);
const pluginDal = new MockOrchestratorPluginDal(OrchestratorPluginDal);
const mockLambda = new MockLambda(Lambda);
process.env.pluginTable = 'TestPluginTable';
process.env.activity = 'test';
process.env.unittest = 'true';
process.env.stage = 'pre';

import { start } from './syncStage';

describe('start', () => {
    beforeEach(() => {
        dal.reset();
        mockLambda.reset();
        pluginDal.reset();
    });

    test('Null input', async () => {
        let error = null;
        try {
            await start(null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Event data unexpected');
    });
    test('Missing uid', async () => {
        let error = null;
        const event = getDefaultEvent();
        event.uid = undefined;
        try {
            await start(event);
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe("Event data unexpected (uid: 'undefined')");
    });
    test('No plugins', async () => {
        pluginDal.getPluginsResults = [] as any;
        const event = getDefaultEvent();
        await start(event);
    });

    test('Missing function name', async () => {
        dal.getStatusObjectResult = {
            activities: {
                test: {
                    post: {
                        status: {
                            state: OrchestratorComponentState.Complete
                        }
                    }
                }
            }
        };
        pluginDal.getPluginsResults = [
            { pluginName: 'test' } as any
        ];
        const event = getDefaultEvent();
        let error = null;
        try {
            await start(event);
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe(`Plugin does not have required values ${JSON.stringify({ pluginName: 'test' })}`);
    });

    test('No registered plugins', async () => {
        const event = getDefaultEvent();
        pluginDal.getPluginsResults = [];
        await start(event);

        expect(mockLambda.invokeParams.length).toBe(0);
        expect(dal.updateStageStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
    });

    test('Valid', async () => {
        dal.getStatusObjectResult = {
            activities: {
                test: {
                    post: {
                        mandatory: {
                            test: {
                                state: OrchestratorComponentState.NotStarted
                            }
                        },
                        status: {
                            state: OrchestratorComponentState.Complete
                        }
                    }
                }
            }
        };
        dal.getSyncPluginsRetval = [
            {
                functionName: 'test',
                pluginName: 'test',
                mandatory: true,
                order: 1
            }
        ];
        const event = getDefaultEvent();
        await start(event);
    });

    test('Lambda Exception Thrown', async () => {
        mockLambda.invokeRetval = { FunctionError: 'This is an error' };
        pluginDal.getPluginsResults = [
            { pluginName: 'test', functionName: 'test' } as any
        ];
        dal.getStatusObjectResult = {
            activities: {
                test: {
                    post: {
                        mandatory: {
                            test: {
                                state: OrchestratorComponentState.NotStarted
                            }
                        },
                        status: {
                            state: OrchestratorComponentState.Error
                        }
                    }
                }
            }
        };
        dal.getSyncPluginsRetval = [
            {
                functionName: 'test',
                pluginName: 'test',
                mandatory: true,
                order: 1
            } as any
        ];
        const event = getDefaultEvent();
        let error = null;
        try {
            await start(event);
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('This is an error');
        expect(dal.updateStageStatusInput[1].state).toBe(OrchestratorComponentState.Error);
        expect(dal.updateStageStatusInput[1].message).toBe('This is an error');
    });
});

function getDefaultEvent () {
    return {
        uid: 'uid',
        company: 'company',
        lineOfBusiness: 'lob',
        riskState: 'state',
        effectiveDate: 1,
        policies: [{ id: 'test' }],
        workflow: 'test',
        metadata: {
            workflow: 'issue'
        }
    };
}

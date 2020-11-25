/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { start, setServices } from './syncStage';
import { OrchestratorPluginDal, OrchestratorStatusDal } from '../../__mock__/libServices';
import { MockLambda } from '../../__mock__/aws';
import { OrchestratorComponentState } from '@moe-tech/orchestrator';


const dal = new OrchestratorStatusDal();
const pluginDal = new OrchestratorPluginDal();
const mockLambda = new MockLambda();
process.env.environment = 'unit-test';

describe('start test', () => {
    setServices('test', dal as any, pluginDal as any, mockLambda as any);
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
            { } as any
        ];
        const event = getDefaultEvent();
        let error = null;
        try {
            await start(event);
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe(`Plugin does not have required values ${JSON.stringify({})}`);
    });

    test('No registered plugins', async () => {
        const event = getDefaultEvent();
        pluginDal.getPluginsResults = [];
        await start(event);

        expect(mockLambda.invokeParams.length).toBe(0);
        expect(dal.updateStageStatusInput.state).toBe(OrchestratorComponentState.Complete);
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
        expect(dal.updateStageStatusInput.state).toBe(OrchestratorComponentState.Error);
        expect(dal.updatePluginStatusInput.state).toBe(OrchestratorComponentState.Error);
        expect(dal.updateStageStatusInput.message).toBe('This is an error');
    });
});

function getDefaultEvent() {
    return {
        uid: 'uid', company: 'company', lineOfBusiness: 'lob', riskState: 'state',
        effectiveDate: 1, policies: [{ id: 'test' }], workflow: 'test', metadata: {
            workflow: 'issue'
        }
    };
}

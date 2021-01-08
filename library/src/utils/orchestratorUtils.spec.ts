import {
    OrchestratorError, PluginInfo, OrchestratorComponentState,
    OrchestratorStage, OrchestratorPluginMessage
} from '../types';
import { MockOrchestratorStatusDal } from '../__mock__/dals';
import { SNSEvent } from 'aws-lambda';

import * as orchestratorUtils from './orchestratorUtils';

process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
const mockOrchstratorStatusDal = new MockOrchestratorStatusDal();

describe('orchestratorWrapperSqs', () => {
    beforeEach(() => {
        mockOrchstratorStatusDal.reset();
        process.env.debugInput = 'true';
    });

    test('valid', async () => {
        process.env.debugInput = 'false';
        const fn = jest.fn();
        const wrapper = orchestratorUtils.orchestratorWrapperSqs(getPluginInfo(), fn);
        await wrapper(getPluginMessageSqs());

        expect(mockOrchstratorStatusDal.updatePluginStatus).toBeCalledTimes(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
    });

    test('debug on', async () => {
        const fn = jest.fn();
        const wrapper = orchestratorUtils.orchestratorWrapperSqs(getPluginInfo(), fn);
        await wrapper(getPluginMessageSqs());

        expect(mockOrchstratorStatusDal.updatePluginStatus).toBeCalledTimes(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
    });

    test('override mandatory for activity', async () => {
        const fn = jest.fn();
        const pluginInfo = getPluginInfo();
        pluginInfo.overrides = {
            test: {
                mandatory: false
            }
        };
        const wrapper = orchestratorUtils.orchestratorWrapperSqs(pluginInfo, fn);
        await wrapper(getPluginMessageSqs());

        expect(mockOrchstratorStatusDal.updatePluginStatus).toBeCalledTimes(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].mandatory).toBe(false);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].mandatory).toBe(false);
    });

    test('Orchestrator Error', async () => {
        const wrapper = orchestratorUtils.orchestratorWrapperSqs(getPluginInfo(), () => {
            throw new OrchestratorError('This is an error');
        });

        await wrapper(getPluginMessageSqs());

        expect(mockOrchstratorStatusDal.updatePluginStatus).toBeCalledTimes(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Error);
    });

    test('Error', async () => {
        const wrapper = orchestratorUtils.orchestratorWrapperSqs(getPluginInfo(), () => {
            throw new Error('This is an error');
        });

        let error = null;
        try {
            await wrapper(getPluginMessageSqs());
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('This is an error');

        expect(mockOrchstratorStatusDal.updatePluginStatus).toBeCalledTimes(1);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
    });

    test('Invalid Message', async () => {
        const wrapper = orchestratorUtils.orchestratorWrapperSqs(getPluginInfo(), () => {
            throw new Error('This is an error');
        });

        let error = null;
        try {
            await wrapper(getPluginMessageSns());
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('The message recieved cannot be handled');

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(0);
    });
});

describe('orchestratorWrapperSns', () => {
    beforeEach(() => {
        mockOrchstratorStatusDal.reset();
        process.env.debugInput = 'true';
    });

    test('valid', async () => {
        process.env.debugInput = 'false';
        const fn = jest.fn();
        const wrapper = orchestratorUtils.orchestratorWrapperSns(getPluginInfo(), fn);
        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.updatePluginStatus).toBeCalledTimes(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
    });

    test('registration', async () => {
        process.env.debugInput = 'false';
        const fn = jest.fn();
        const pluginInfo = getPluginInfo();
        const wrapper = orchestratorUtils.orchestratorWrapperSns(pluginInfo, fn);
        const message = getPluginMessageSnsRegistration();
        const result = await wrapper(message);

        expect(result).toBe(pluginInfo);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(0);
    });

    test('already marked as complete', async () => {
        process.env.debugInput = 'false';
        const plugin = getPluginInfo();
        plugin.idempotent = true;
        const statusObj = {
            workflow: 'workflow',
            activities: {
            }
        } as OrchestratorPluginMessage;
        statusObj.activities.test = {
            pre: {
                optional: {},
                mandatory: {
                    Test: {
                        state: OrchestratorComponentState.Complete
                    }
                },
                status: {
                    state: OrchestratorComponentState.Complete
                }
            },
            async: {
                optional: {},
                mandatory: {},
                status: {
                    state: OrchestratorComponentState.Complete
                }
            },
            post: {
                optional: {},
                mandatory: {},
                status: {
                    state: OrchestratorComponentState.Complete
                }
            },
            status: {
                state: OrchestratorComponentState.Complete
            }
        };
        mockOrchstratorStatusDal.getStatusObject.mockResolvedValueOnce(statusObj);
        const fn = jest.fn();
        const wrapper = orchestratorUtils.orchestratorWrapperSns(plugin, fn);
        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.getStatusObject).toHaveBeenCalledTimes(1);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(0);
        expect(mockOrchstratorStatusDal.updatePluginStatus).toHaveBeenCalledTimes(0);
    });

    test('already marked as complete - idempotent - no db', async () => {
        process.env.debugInput = 'false';
        const plugin = getPluginInfo();
        plugin.idempotent = true;
        const statusObj = {
            workflow: 'workflow',
            activities: {
            }
        } as OrchestratorPluginMessage;
        statusObj.activities.test = {
            pre: {
                optional: {},
                mandatory: {
                    Test: {
                        state: OrchestratorComponentState.Complete
                    }
                },
                status: {
                    state: OrchestratorComponentState.Complete
                }
            },
            async: {
                optional: {},
                mandatory: {},
                status: {
                    state: OrchestratorComponentState.Complete
                }
            },
            post: {
                optional: {},
                mandatory: {},
                status: {
                    state: OrchestratorComponentState.Complete
                }
            },
            status: {
                state: OrchestratorComponentState.Complete
            }
        };
        mockOrchstratorStatusDal.getStatusObject.mockResolvedValueOnce(statusObj);
        const fn = jest.fn();
        const wrapper = orchestratorUtils.orchestratorWrapperSns(plugin, fn);

        await wrapper(getPluginMessageSns(statusObj.activities));

        expect(mockOrchstratorStatusDal.getStatusObject).toHaveBeenCalledTimes(0);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(0);
        expect(mockOrchstratorStatusDal.updatePluginStatus).toHaveBeenCalledTimes(0);
    });

    test('already marked as complete - not idempotent - no db', async () => {
        process.env.debugInput = 'false';
        const plugin = getPluginInfo();
        plugin.idempotent = false;
        const statusObj = {
            workflow: 'workflow',
            activities: {
            }
        } as OrchestratorPluginMessage;
        statusObj.activities.test = {
            pre: {
                optional: {},
                mandatory: {
                    Test: {
                        state: OrchestratorComponentState.Complete
                    }
                },
                status: {
                    state: OrchestratorComponentState.Complete
                }
            },
            async: {
                optional: {},
                mandatory: {},
                status: {
                    state: OrchestratorComponentState.Complete
                }
            },
            post: {
                optional: {},
                mandatory: {},
                status: {
                    state: OrchestratorComponentState.Complete
                }
            },
            status: {
                state: OrchestratorComponentState.Complete
            }
        };
        mockOrchstratorStatusDal.getStatusObject.mockResolvedValueOnce(statusObj);
        const fn = jest.fn();
        const wrapper = orchestratorUtils.orchestratorWrapperSns(plugin, fn);

        await wrapper(getPluginMessageSns(statusObj.activities));

        expect(mockOrchstratorStatusDal.getStatusObject).toHaveBeenCalledTimes(0);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(0);
        expect(mockOrchstratorStatusDal.updatePluginStatus).toHaveBeenCalledTimes(0);
    });

    test('already marked as complete - not idempotent - not complete', async () => {
        process.env.debugInput = 'false';
        const plugin = getPluginInfo();
        plugin.idempotent = false;
        const statusObj = {
            workflow: 'workflow',
            activities: {
            }
        } as OrchestratorPluginMessage;
        statusObj.activities.test = {
            pre: {
                optional: {},
                mandatory: {
                    Test: {
                        state: OrchestratorComponentState.NotStarted
                    }
                },
                status: {
                    state: OrchestratorComponentState.NotStarted
                }
            },
            async: {
                optional: {},
                mandatory: {},
                status: {
                    state: OrchestratorComponentState.NotStarted
                }
            },
            post: {
                optional: {},
                mandatory: {},
                status: {
                    state: OrchestratorComponentState.NotStarted
                }
            },
            status: {
                state: OrchestratorComponentState.NotStarted
            }
        };
        mockOrchstratorStatusDal.getStatusObject.mockResolvedValueOnce(statusObj);
        const fn = jest.fn();
        const wrapper = orchestratorUtils.orchestratorWrapperSns(plugin, fn);

        await wrapper(getPluginMessageSns(statusObj.activities));

        expect(mockOrchstratorStatusDal.getStatusObject).toHaveBeenCalledTimes(0);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatus).toHaveBeenCalledTimes(2);
    });

    test('debug on', async () => {
        const fn = jest.fn();
        const wrapper = orchestratorUtils.orchestratorWrapperSns(getPluginInfo(), fn);
        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
    });

    test('override mandatory for activity', async () => {
        const fn = jest.fn();
        const pluginInfo = getPluginInfo();
        pluginInfo.overrides = {
            test: {
                mandatory: false
            }
        };
        const wrapper = orchestratorUtils.orchestratorWrapperSns(pluginInfo, fn);
        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].mandatory).toBe(false);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].mandatory).toBe(false);
    });

    test('Orchestrator Error', async () => {
        const wrapper = orchestratorUtils.orchestratorWrapperSns(getPluginInfo(), () => {
            throw new OrchestratorError('This is an error');
        });

        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Error);
    });

    test('Error', async () => {
        const wrapper = orchestratorUtils.orchestratorWrapperSns(getPluginInfo(), () => {
            throw new Error('This is an error');
        });

        let error = null;
        try {
            await wrapper(getPluginMessageSns());
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('This is an error');

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(1);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
    });
});

describe('getOrchestratorSqsPassthrough', () => {
    beforeEach(() => {
        mockOrchstratorStatusDal.reset();
        process.env.debugInput = 'true';
    });
    test('standard', async () => {
        let sqsParams = null;
        const sqsOverride = sqsMock(function t (p) { sqsParams = p; });
        orchestratorUtils.setSqsOverride(sqsOverride as any);
        const pluginInfo = { pluginName: 'test', default: { mandatory: false }, alwaysRun: true } as PluginInfo;
        const passthrough = orchestratorUtils.getOrchestratorSqsPassthrough(pluginInfo, 'sqsUrl');
        const event = getPluginMessageSns() as SNSEvent;
        await passthrough(event);
        expect(sqsParams).toStrictEqual({
            QueueUrl: 'sqsUrl',
            MessageBody: event.Records[0].Sns.Message
        });
    });

    test('fifo', async () => {
        let sqsParams = null;
        const sqsOverride = sqsMock(function t (p) { sqsParams = p; });
        orchestratorUtils.setSqsOverride(sqsOverride as any);
        const pluginInfo = { pluginName: 'test', default: { mandatory: false }, alwaysRun: true } as PluginInfo;
        const passthrough = orchestratorUtils.getOrchestratorSqsPassthrough(pluginInfo, 'sqsUrl.fifo');
        const event = getPluginMessageSns() as SNSEvent;
        await passthrough(event);
        expect(sqsParams).toStrictEqual({
            QueueUrl: 'sqsUrl.fifo',
            MessageBody: event.Records[0].Sns.Message,
            MessageGroupId: 'uid-id'
        });
    });
});

function sqsMock (callback: Function) {
    return {
        sendMessage: (params) => {
            callback(params);
            return {
                promise: async () => {
                    return {};
                }
            };
        }
    };
}

function getPluginInfo (): PluginInfo {
    return {
        pluginName: 'Test',
        default: {
            mandatory: true
        }
    };
}
function getPluginMessageSqs () {
    return {
        Records: [{
            body:
                JSON.stringify(
                    {
                        id: 'test',
                        activity: 'test',
                        uid: 'uid-id',
                        workflow: 'workflow',
                        test: {
                            mandatory: {}
                        },
                        policies: ['test']
                    })
        }
        ]
    };
}

function getPluginMessageSns (activities = undefined) {
    return {
        Records: [{
            Sns:
            {
                Message: JSON.stringify(
                    {
                        id: 'test',
                        activity: 'test',
                        uid: 'uid-id',
                        workflow: 'workflow',
                        stage: OrchestratorStage.PreProcessing,
                        test: {
                            mandatory: {}
                        },
                        activities,
                        policies: ['test']
                    })
            }
        }
        ]
    };
}
function getPluginMessageSnsRegistration () {
    return {
        Records: [{
            Sns:
            {
                Message: JSON.stringify(
                    {
                        id: 'test',
                        activity: 'test',
                        uid: 'uid-id',
                        workflow: 'workflow',
                        stage: OrchestratorStage.PreProcessing,
                        initialize: true,
                        test: {
                            mandatory: {}
                        },
                        policies: ['test']
                    })
            }
        }
        ]
    };
}

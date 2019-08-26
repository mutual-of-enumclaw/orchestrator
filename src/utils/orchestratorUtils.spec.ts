import { orchestratorWrapperSqs, orchestratorWrapperSns, setOASDOverride } from './orchestratorUtils';
import {
    OrchestratorError, PluginInfo, OrchestratorComponentState,
    OrchestratorWorkflowStatus, OrchestratorStage
} from '../types';
import { mockOrchstratorStatusDal } from '../../__mock__/mockOrchestratorStatusDal';

process.env.environment = 'unit-test';

setOASDOverride(mockOrchstratorStatusDal as any)

describe('orchestratorWrapperSqs', () => {
    test('valid', async () => {
        process.env.debugInput = 'false';
        mockOrchstratorStatusDal.reset();
        const fn = jest.fn();
        const wrapper = orchestratorWrapperSqs(getPluginInfo(), fn);
        await wrapper(getPluginMessageSqs());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
    });

    test('debug on', async () => {
        process.env.debugInput = 'true';
        mockOrchstratorStatusDal.reset();
        const fn = jest.fn();
        const wrapper = orchestratorWrapperSqs(getPluginInfo(), fn);
        await wrapper(getPluginMessageSqs());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
    });

    test('override mandatory for activity', async () => {
        process.env.debugInput = 'true';
        mockOrchstratorStatusDal.reset();
        const fn = jest.fn();
        const pluginInfo = getPluginInfo();
        pluginInfo.overrides = {
            test: {
                mandatory: false
            }
        }
        const wrapper = orchestratorWrapperSqs(pluginInfo, fn);
        await wrapper(getPluginMessageSqs());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].mandatory).toBe(false);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].mandatory).toBe(false);
    });

    test('Orchestrator Error', async () => {
        process.env.debugInput = 'true';
        mockOrchstratorStatusDal.reset();

        const wrapper = orchestratorWrapperSqs(getPluginInfo(), () => {
            throw new OrchestratorError('This is an error');
        });

        await wrapper(getPluginMessageSqs());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Error);
    });

    test('Error', async () => {
        process.env.debugInput = 'true';
        mockOrchstratorStatusDal.reset();

        const wrapper = orchestratorWrapperSqs(getPluginInfo(), () => {
            throw new Error('This is an error');
        });

        let error = null;
        try {
            await wrapper(getPluginMessageSqs());
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('This is an error');

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(1);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
    });

    test('Invalid Message', async () => {
        process.env.debugInput = 'true';
        mockOrchstratorStatusDal.reset();

        const wrapper = orchestratorWrapperSqs(getPluginInfo(), () => {
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
    test('valid', async () => {
        process.env.debugInput = 'false';
        mockOrchstratorStatusDal.reset();
        const fn = jest.fn();
        const wrapper = orchestratorWrapperSns(getPluginInfo(), fn);
        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
    });

    test('registration', async () => {
        process.env.debugInput = 'false';
        mockOrchstratorStatusDal.reset();
        const fn = jest.fn();
        const pluginInfo = getPluginInfo();
        const wrapper = orchestratorWrapperSns(pluginInfo, fn);
        const message = getPluginMessageSnsRegistration();
        const result = await wrapper(message);

        expect(result).toBe(pluginInfo);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(0);
    });

    test('debug on', async () => {
        process.env.debugInput = 'true';
        mockOrchstratorStatusDal.reset();
        const fn = jest.fn();
        const wrapper = orchestratorWrapperSns(getPluginInfo(), fn);
        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.updatePluginStatus).toHaveBeenCalledTimes(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
    });
    test('already marked as complete', async () => {
        process.env.debugInput = 'false';
        mockOrchstratorStatusDal.reset();
        const plugin = getPluginInfo();
        const statusObj = {
            workflow: 'workflow',
            activities: {
            }
        } as OrchestratorWorkflowStatus;
        statusObj.activities['test'] = {
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
        const wrapper = orchestratorWrapperSns(plugin, fn);
        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(0);
        expect(mockOrchstratorStatusDal.updatePluginStatus).toHaveBeenCalledTimes(0);
    });
    test('already marked as complete but always run set true', async () => {
        process.env.debugInput = 'false';
        mockOrchstratorStatusDal.reset();
        const plugin = getPluginInfo();
        plugin.alwaysRun = true;
        const statusObj = {
            workflow: 'workflow',
            activities: {
            }
        } as OrchestratorWorkflowStatus;
        statusObj.activities['test'] = {
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
        const wrapper = orchestratorWrapperSns(plugin, fn);
        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatus).toHaveBeenCalledTimes(2);
    });
    test('override mandatory for activity', async () => {
        process.env.debugInput = 'true';
        mockOrchstratorStatusDal.reset();
        const fn = jest.fn();
        const pluginInfo = getPluginInfo();
        pluginInfo.overrides = {
            test: {
                mandatory: false
            }
        };
        const wrapper = orchestratorWrapperSns(pluginInfo, fn);
        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].mandatory).toBe(false);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Complete);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].mandatory).toBe(false);
    });

    test('Orchestrator Error', async () => {
        process.env.debugInput = 'true';
        mockOrchstratorStatusDal.reset();

        const wrapper = orchestratorWrapperSns(getPluginInfo(), () => {
            throw new OrchestratorError('This is an error');
        });

        await wrapper(getPluginMessageSns());

        expect(mockOrchstratorStatusDal.updatePluginStatusInput.length).toBe(2);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[0].state).toBe(OrchestratorComponentState.InProgress);
        expect(mockOrchstratorStatusDal.updatePluginStatusInput[1].state).toBe(OrchestratorComponentState.Error);
    });

    test('Error', async () => {
        process.env.debugInput = 'true';
        mockOrchstratorStatusDal.reset();

        const wrapper = orchestratorWrapperSns(getPluginInfo(), () => {
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

function getPluginInfo(): PluginInfo {
    return {
        pluginName: 'Test',
        default: {
            mandatory: true
        }
    };
}
function getPluginMessageSqs() {
    return {
        Records: [{
            body:
                JSON.stringify(
                    {
                        id: "test",
                        activity: "test",
                        uid: "uid-id",
                        workflow: "workflow",
                        test: {
                            "mandatory": {}
                        },
                        policies: ["test"]
                    })
        }
        ]
    };
}

function getPluginMessageSns() {
    return {
        Records: [{
            Sns:
            {
                Message: JSON.stringify(
                    {
                        id: "test",
                        activity: "test",
                        uid: "uid-id",
                        workflow: "workflow",
                        stage: OrchestratorStage.PreProcessing,
                        test: {
                            "mandatory": {}
                        },
                        policies: ["test"]
                    })
            }
        }
        ]
    };
}
function getPluginMessageSnsRegistration() {
    return {
        Records: [{
            Sns:
            {
                Message: JSON.stringify(
                    {
                        id: "test",
                        activity: "test",
                        uid: "uid-id",
                        workflow: "workflow",
                        stage: OrchestratorStage.PreProcessing,
                        initialize: true,
                        test: {
                            "mandatory": {}
                        },
                        policies: ["test"]
                    })
            }
        }
        ]
    };
}
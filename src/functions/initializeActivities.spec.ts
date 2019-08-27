import { initialize, setDynamoDal, resetErrorStatusInSection, getActivity } from './initializeActivities'
import { OrchestratorWorkflowStatus, OrchestratorComponentState } from '..';
import { OrchestratorSyncStatus } from '../types';
class MockDynamoDb {
    putInput: any = null;

    reset() {
        this.putInput = null;
    }
    put(params) {
        this.putInput = params;
        return this;
    }
    get() {
        return this;
    }
    promise = jest.fn();
}

const dynamodb = new MockDynamoDb();
describe('initialize', () => {
    process.env.environment = 'unit-test';
    setDynamoDal(dynamodb as any);
    test('Null event', async () => {
        dynamodb.reset();
        let error = null;
        try {
            await initialize(null);
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('Event is either invalid or malformed');
        expect(dynamodb.putInput).toBeNull();
    });

    test('Empty uid', async () => {
        dynamodb.reset();
        let error = null;
        try {
            const event = createEvent();
            event.uid = '';
            await initialize(event);
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('Event is either invalid or malformed');
        expect(dynamodb.putInput).toBeNull();
    });

    test('Empty workflow', async () => {
        dynamodb.reset();
        let error = null;
        try {
            const event = createEvent();
            event.metadata.workflow = '';
            await initialize(event);
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('Event metadata is either invalid or malformed');
        expect(dynamodb.putInput).toBeNull();
    });
    test('Undefined stages', async () => {
        dynamodb.reset();
        let error = null;
        try {
            const event = createEvent();
            delete event.stages;
            await initialize(event);
        } catch (err) {
            error = err.message;
        }

        expect(error).toBe('Stages has not been defined');
        expect(dynamodb.putInput).toBeNull();
    });
    test('Valid', async () => {
        dynamodb.reset();
        const event = createEvent();
        const result = await initialize(event);
        const expected = createExpected(result.currentDate, {
            Stage1: createStep()
        });
        expect(result).toMatchObject(expected);
        expect(dynamodb.putInput).toBeDefined();
    });
    test('Valid multiple steps', async () => {
        dynamodb.reset();
        const event = createEvent();
        event.stages = { Test1: null, Test2: null };
        const result = await initialize(event);
        const expected = createExpected(result.currentDate, {
            Test1: createStep(),
            Test2: createStep()
        });
        expect(result).toMatchObject(expected);
        expect(dynamodb.putInput).toBeDefined();
    });

    test('failed mismatching metadata.', async () => {
        dynamodb.reset();
        const savedVal = {
            Item: {
                activities: {
                    Test1: createStep()
                },
                status: {
                    state: OrchestratorComponentState.Complete
                },
                metadata: {

                }
            }

        };

        dynamodb.promise.mockResolvedValueOnce(savedVal);
        const event = createEvent();
        event.stages = { Test1: undefined, Test2: undefined };
        let ex = undefined;
        try {

            const result = await initialize(event);
        } catch (error) {
            ex = error;
        }
        expect(ex).toBeDefined();

    });
    test('Valid multiple fail test.', async () => {
        dynamodb.reset();
        const savedVal = {
            Item: {
                activities: {
                    Test1: createStep()
                },
                status: {
                    state: OrchestratorComponentState.Complete
                },
                metadata: {
                    company: "0",
                    effectiveDate: "1/2/2018",
                    lineOfBusiness: 'Personal',
                    policies: [{ policyId: "00283316-d954-74f6-de8b-1f72b9b58e66" }],
                    riskState: 'ID',
                    workflow: 'test'
                }
            }
        };
        const value = savedVal.Item.activities.Test1;
        value.pre.mandatory['completed'] = { state: OrchestratorComponentState.Complete };
        value.pre.mandatory['failed'] = { state: OrchestratorComponentState.Error };
        value.pre.optional['optionalError'] = { state: OrchestratorComponentState.OptionalError };
        dynamodb.promise.mockResolvedValueOnce(savedVal);
        const event = createEvent();
        event.stages = { Test1: null, Test2: null };
        const result = await initialize(event);


        value.pre.mandatory['failed'].state = OrchestratorComponentState.NotStarted;
        value.pre.optional['optionalError'].state = OrchestratorComponentState.NotStarted;
        expect(result.activities.Test1.pre).toEqual(value.pre);
        expect(dynamodb.putInput).toBeDefined();
    });
    describe('resetErrorStatusInSection', () => {
        test('optional: set errors to not started, but leave other statuss in tact', () => {
            // arrange
            const value = {
                status: {
                    state: "Complete"
                },
                optional: {},
            } as OrchestratorSyncStatus;
            value.optional['plugin1'] = {
                state: OrchestratorComponentState.Complete
            };
            value.optional['plugin2'] = {
                state: OrchestratorComponentState.Error
            };
            value.optional['plugin3'] = {
                state: OrchestratorComponentState.OptionalError
            };

            // act
            resetErrorStatusInSection(value);
            // assert
            expect(value.optional.plugin1.state === OrchestratorComponentState.Complete);
            expect(value.optional.plugin2.state === OrchestratorComponentState.NotStarted);
            expect(value.optional.plugin3.state === OrchestratorComponentState.NotStarted);
        });
        test('mandatory: set errors to not started, but leave other statuss in tact', () => {
            // arrange
            const value = {
                status: {
                    state: "Complete"
                },
                mandatory: {},
            } as OrchestratorSyncStatus;
            value.mandatory['plugin1'] = {
                state: OrchestratorComponentState.Complete
            };
            value.mandatory['plugin2'] = {
                state: OrchestratorComponentState.Error
            };
            value.mandatory['plugin3'] = {
                state: OrchestratorComponentState.OptionalError
            };

            // act
            resetErrorStatusInSection(value);
            // assert
            expect(value.mandatory.plugin1.state === OrchestratorComponentState.Complete);
            expect(value.mandatory.plugin2.state === OrchestratorComponentState.NotStarted);
            expect(value.mandatory.plugin3.state === OrchestratorComponentState.NotStarted);
        });
        test('not error when no data is passed', () => {
            const value = undefined;
            // act
            resetErrorStatusInSection(value);
            // assert
            expect(value).toEqual(undefined);
        });
    });
    describe('getActivity', () => {
        test('return undefined if call returns undefined', async () => {
            dynamodb.reset();
            const savedVal = undefined;
            const event = {
                metadata: {
                    uid: 'uid',
                    workflow: 'workflow'
                }
            } as any;
            dynamodb.promise.mockResolvedValueOnce(savedVal);
            const value = await getActivity(event);
            expect(value).toBeUndefined();
        });
        test('return undefined if call returns item as undefined', async () => {
            dynamodb.reset();
            const savedVal = {
                
            };
            const event = {
                metadata: {
                    uid: 'uid',
                    workflow: 'workflow'
                }
            } as any;
            dynamodb.promise.mockResolvedValueOnce(savedVal);
            const value = await getActivity(event);
            expect(value).toBeUndefined();
        });
    });
});

describe('setDynamoDal', () => {
    test('setDynamoDal', () => {
        process.env.environment = 'not unit test';
        let error = null;
        try {
            setDynamoDal({} as any);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Unit testing feature being used outside of unit testing');
    });
});

function createStep(): any {
    return {
        pre: {
            mandatory: {},
            optional: {},
            status: {
                state: OrchestratorComponentState.NotStarted,
                message: null
            }
        },
        async: {
            mandatory: {},
            optional: {},
            status: {
                state: OrchestratorComponentState.NotStarted,
                message: null
            }
        },
        post: {
            mandatory: {},
            optional: {},
            status: {
                state: OrchestratorComponentState.NotStarted,
                message: null
            }
        },
        status: {
            state: OrchestratorComponentState.NotStarted,
            message: null
        }
    };
}

function createExpected(currentDate: number, activities: any) {
    const expected = createEvent();
    delete expected.stages;
    expected.currentDate = currentDate;
    expected.status = {
        state: OrchestratorComponentState.NotStarted
    };

    expected.activities = activities;

    return expected;
}

function createEvent(): any {
    return {
        uid: '123',
        stages: {
            Stage1: ''
        },
        metadata: {
            company: "0",
            effectiveDate: "1/2/2018",
            lineOfBusiness: 'Personal',
            policies: [{ policyId: "00283316-d954-74f6-de8b-1f72b9b58e66" }],
            riskState: 'ID',
            workflow: 'test'
        }
    };
}

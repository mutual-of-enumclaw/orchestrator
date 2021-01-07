import { MockDynamoDb } from '@moe-tech/orchestrator/__mock__/aws';
import { OrchestratorComponentState, OrchestratorSyncStatus } from '@moe-tech/orchestrator';
import { DynamoDB } from 'aws-sdk';

import { initialize, resetErrorStatusInSection, getActivity } from './initializeActivities';

process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'TestStatusTable' });
console.log = () => {};
const dynamodb = new MockDynamoDb(DynamoDB.DocumentClient);
process.env.statusTable = 'TestStatusTable';

describe('initialize', () => {
    beforeAll(() => {
        global.gc && global.gc()
    });
    beforeEach(() => {
        dynamodb.reset();
    });

    test('Null event', async () => {
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
        const event = createEvent();
        const result = await initialize(event);
        const expected = createExpected(result.currentDate, {
            Stage1: createStep()
        });
        expect(result).toMatchObject(expected);
        expect(dynamodb.put).toBeCalled();
        expect(dynamodb.putInput.ConditionExpression).toBe('attribute_not_exists(uid)');
    });
    test('Valid multiple steps', async () => {
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

        dynamodb.getReturn = savedVal.Item;
        const event = createEvent();
        event.stages = { Test1: undefined, Test2: undefined };
        let ex;
        try {
            await initialize(event);
        } catch (error) {
            ex = error.message;
        }
        expect(ex).toBe('metadata does not match metadata with same UID from database');
    });

    test('Metadata out of order.', async () => {
        const savedVal = {
            Item: {
                metadata: {
                    company: '0',
                    effectiveDate: '1/2/2018',
                    policies: [{ policyId: '00283316-d954-74f6-de8b-1f72b9b58e66' }],
                    lineOfBusiness: 'Personal',
                    riskState: 'ID',
                    workflow: 'test'
                }
            }
        };

        dynamodb.getReturn = savedVal.Item;
        const event = createEvent();
        event.stages = { Test1: undefined, Test2: undefined };
        await initialize(event);
    });

    test('Valid multiple fail test.', async () => {
        const savedVal = {
            Item: {
                activities: {
                    Test1: createStep()
                },
                status: {
                    state: OrchestratorComponentState.Complete
                },
                metadata: {
                    company: '0',
                    effectiveDate: '1/2/2018',
                    lineOfBusiness: 'Personal',
                    policies: [{ policyId: '00283316-d954-74f6-de8b-1f72b9b58e66' }],
                    riskState: 'ID',
                    workflow: 'test'
                }
            }
        };
        const value = savedVal.Item.activities.Test1;
        value.pre.mandatory.completed = { state: OrchestratorComponentState.Complete };
        value.pre.mandatory.failed = { state: OrchestratorComponentState.Error };
        value.pre.optional.optionalError = { state: OrchestratorComponentState.OptionalError };
        dynamodb.getReturn = savedVal.Item;
        const event = createEvent();
        event.stages = { Test1: null, Test2: null };
        const result = await initialize(event);

        value.pre.mandatory.failed.state = OrchestratorComponentState.NotStarted;
        value.pre.optional.optionalError.state = OrchestratorComponentState.NotStarted;
        expect(result.activities.Test1.pre).toEqual(value.pre);
        expect(dynamodb.putInput).toBeDefined();
    });
    describe('resetErrorStatusInSection', () => {
        beforeEach(() => {
            dynamodb.reset();
        });

        test('optional: set errors to not started, but leave other statuss in tact', () => {
            // arrange
            const value = {
                status: {
                    state: 'Complete'
                },
                optional: {}
            } as OrchestratorSyncStatus;
            value.optional.plugin1 = {
                state: OrchestratorComponentState.Complete
            };
            value.optional.plugin2 = {
                state: OrchestratorComponentState.Error
            };
            value.optional.plugin3 = {
                state: OrchestratorComponentState.OptionalError
            };

            // act
            resetErrorStatusInSection(value);
            // assert
            expect(value.optional.plugin1.state === OrchestratorComponentState.Complete);
            expect(value.optional.plugin2.state === OrchestratorComponentState.NotStarted);
            expect(value.optional.plugin3.state === OrchestratorComponentState.NotStarted);
        });
        test('mandatory: set errors to not started, but leave other status in tact', () => {
            // arrange
            const value = {
                status: {
                    state: 'Complete'
                },
                mandatory: {}
            } as OrchestratorSyncStatus;
            value.mandatory.plugin1 = {
                state: OrchestratorComponentState.Complete
            };
            value.mandatory.plugin2 = {
                state: OrchestratorComponentState.Error
            };
            value.mandatory.plugin3 = {
                state: OrchestratorComponentState.OptionalError
            };

            // act
            resetErrorStatusInSection(value);
            // assert
            expect(value.mandatory.plugin1.state).toBe(OrchestratorComponentState.Complete);
            expect(value.mandatory.plugin2.state).toBe(OrchestratorComponentState.NotStarted);
            expect(value.mandatory.plugin3.state).toBe(OrchestratorComponentState.NotStarted);
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
            process.env.statusTable = 'statusTable';
            const savedVal = undefined;
            const event = createEvent();

            // This happens early on in the initialize process.  This step is to simulate that.
            event.workflow = event.metadata.workflow;

            dynamodb.getReturn = null;
            const value = await getActivity(event);
            expect(value).toBeUndefined();
            expect(dynamodb.get).toBeCalledWith({ TableName: 'statusTable', Key: { uid: '123', workflow: 'test' } });
        });
        test('return undefined if call returns item as undefined', async () => {
            dynamodb.reset();
            process.env.statusTable = 'statusTable-test';
            const savedVal = {

            };
            const event = createEvent();

            // This happens early on in the initialize process.  This step is to simulate that.
            event.workflow = event.metadata.workflow;

            dynamodb.getReturn = undefined;
            const value = await getActivity(event);
            expect(value).toBeUndefined();
            expect(dynamodb.get).toBeCalledWith({ TableName: 'statusTable-test', Key: { uid: '123', workflow: 'test' } });
        });
    });
});

function createStep (): any {
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

function createExpected (currentDate: number, activities: any) {
    const expected = createEvent();
    delete expected.stages;
    expected.currentDate = currentDate;
    expected.status = {
        state: OrchestratorComponentState.NotStarted
    };

    expected.activities = activities;

    return expected;
}

function createEvent (): any {
    const retval = {
        uid: '123',
        stages: {
            Stage1: ''
        },
        metadata: {
            company: '0',
            effectiveDate: '1/2/2018',
            lineOfBusiness: 'Personal',
            policies: [{ policyId: '00283316-d954-74f6-de8b-1f72b9b58e66' }],
            riskState: 'ID',
            workflow: 'test'
        }
    };
    return retval;
}

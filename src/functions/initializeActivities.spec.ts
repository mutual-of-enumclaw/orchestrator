import { initialize, setDynamoDal } from './initializeActivities'
import { OrchestratorWorkflowStatus, OrchestratorComponentState } from '..';

class MockDynamoDb {
    putInput: any = null;

    reset() {
        this.putInput = null;
    }
    put(params) {
        this.putInput = params;
        return {
            promise: () => {
                return new Promise((resolve) => { resolve(); });
            }
        }
    }
};

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
        event.stages = {Test1:null, Test2: null};
        const result = await initialize(event);
        const expected = createExpected(result.currentDate, {
            Test1: createStep(),
            Test2: createStep()
        });
        expect(result).toMatchObject(expected);
        expect(dynamodb.putInput).toBeDefined();
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

function createStep() : any {
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

function createEvent() : any {
    return {
        uid: '123',
        stages: {
            Stage1:''
        },
        metadata: {
            company:"0",
            effectiveDate:"1/2/2018",
            lineOfBusiness:'Personal',
            policies:[{policyId: "00283316-d954-74f6-de8b-1f72b9b58e66"}],
            riskState:'ID',
            workflow: 'test'
        }
    };
}

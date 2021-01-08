import { DynamoDBStreamEvent } from 'aws-lambda';
import { MockWorkflowRegister } from '@moe-tech/orchestrator/__mock__/dals';
import { MockStepFunctions } from '@moe-tech/orchestrator/__mock__/aws';
import { WorkflowRegister } from '@moe-tech/orchestrator';
import { StepFunctions } from 'aws-sdk';

process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
process.env.WorkflowRegistry = 'workflowRegistry';
const mockRegister = new MockWorkflowRegister(WorkflowRegister);
const mockStepFunction = new MockStepFunctions(StepFunctions);

describe('handler', () => {
    const handler = require('./startValidationStateMachine').handler;
    process.env.environment = 'unit-test';
    beforeEach(() => {
        mockStepFunction.reset();
        mockRegister.reset();
    });

    test('Null event', async () => {
        await handler(null, null, null);
        expect(mockStepFunction.startExecution).toBeCalledTimes(0);
        expect(mockRegister.registerInput).toBe(null);
    });

    test('Empty event', async () => {
        await handler({}, null, null);
        expect(mockStepFunction.startExecution).toBeCalledTimes(0);
        expect(mockRegister.registerInput).toBe(null);
    });

    test('Records null', async () => {
        await handler({ Records: null }, null, null);
        expect(mockStepFunction.startExecution).toBeCalledTimes(0);
        expect(mockRegister.registerInput).toBe(null);
    });
    test('Records empty', async () => {
        await handler({ Records: [] }, null, null);
        expect(mockStepFunction.startExecution).toBeCalledTimes(0);
        expect(mockRegister.registerInput).toBe(null);
    });
    test('dynamodb not set', async () => {
        await handler({ Records: [{}] }, null, null);
        expect(mockStepFunction.startExecution).toBeCalledTimes(0);
        expect(mockRegister.registerInput).toBe(null);
    });
    test('NewImage not set', async () => {
        await handler({ Records: [{ dynamodb: {} }] }, null, null);
        expect(mockStepFunction.startExecution).toBeCalledTimes(0);
        expect(mockRegister.registerInput).toBe(null);
    });
    test('Valid', async () => {
        const event = createDefaultDynamoEvent();
        await handler(event, null, null);
        expect(mockStepFunction.startExecution).toBeCalledTimes(1);
        expect(mockRegister.registerInput).toBe('workflow');
    });

    test('No uid', async () => {
        const event = createDefaultDynamoEvent();
        event.Records[0].dynamodb.NewImage.uid.S = '';
        await handler(event, null, null);
        expect(mockStepFunction.startExecution).toBeCalledTimes(0);
        expect(mockRegister.registerInput).toBe(null);
    });
    test('No workflow', async () => {
        const event = createDefaultDynamoEvent();
        event.Records[0].dynamodb.NewImage.workflow.S = '';
        await handler(event, null, null);
        expect(mockStepFunction.startExecution).toBeCalledTimes(0);
        expect(mockRegister.registerInput).toBe(null);
    });
    test('Old image exists', async () => {
        const event = createDefaultDynamoEvent();
        event.Records[0].dynamodb.OldImage = event.Records[0].dynamodb.NewImage;
        await handler(event, null, null);
        expect(mockStepFunction.startExecution).toBeCalledTimes(0);
        expect(mockRegister.registerInput).toBe(null);
    });
});

function createDefaultDynamoEvent () : DynamoDBStreamEvent {
    const retval: DynamoDBStreamEvent = {
        Records: [
            {
                dynamodb: {
                    NewImage: {
                        uid: { S: 'uid' },
                        workflow: { S: 'workflow' }
                    },
                    OldImage: null
                }
            }
        ]
    } as any;

    return retval;
}

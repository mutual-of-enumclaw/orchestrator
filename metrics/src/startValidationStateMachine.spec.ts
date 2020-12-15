import { StepFunctions } from 'aws-sdk';
import { DynamoDBStreamEvent } from 'aws-lambda';
import { MockWorkflowRegister } from '@moe-tech/orchestrator/__mock__/dals';

const mockRegister = new MockWorkflowRegister();

class MockStepFunction {
  public startExecution = jest.fn();

  constructor() {
    StepFunctions.prototype.startExecution = this.startExecution;
  }
  reset() {
    this.startExecution.mockReset();
    this.startExecution.mockImplementation((params) => {
      return {
        promise: async () => {
        }
      };
    });
  }
}

const mockStepFunction = new MockStepFunction();

import * as statMachine from './startValidationStateMachine';


describe('handler', () => {
  process.env.environment = 'unit-test';

  test('Null event', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    await statMachine.handler(null, null, null);
    expect(mockStepFunction.startExecution).toBeCalledTimes(0);
    expect(mockRegister.registerInput).toBe(null);
  });

  test('Empty event', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    await statMachine.handler({}, null, null);
    expect(mockStepFunction.startExecution).toBeCalledTimes(0);
    expect(mockRegister.registerInput).toBe(null);
  });

  test('Records null', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    await statMachine.handler({ Records: null }, null, null);
    expect(mockStepFunction.startExecution).toBeCalledTimes(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('Records empty', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    await statMachine.handler({ Records: [] }, null, null);
    expect(mockStepFunction.startExecution).toBeCalledTimes(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('dynamodb not set', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    await statMachine.handler({ Records: [{}] }, null, null);
    expect(mockStepFunction.startExecution).toBeCalledTimes(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('NewImage not set', async () => {
    mockStepFunction.reset();
    await statMachine.handler({ Records: [{ dynamodb: {} }] }, null, null);
    expect(mockStepFunction.startExecution).toBeCalledTimes(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('Valid', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    const event = createDefaultDynamoEvent();
    await statMachine.handler(event, null, null);
    expect(mockStepFunction.startExecution).toBeCalledTimes(1);
    expect(mockRegister.registerInput).toBe('workflow');
  });

  test('No uid', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    const event = createDefaultDynamoEvent();
    event.Records[0].dynamodb.NewImage.uid.S = '';
    await statMachine.handler(event, null, null);
    expect(mockStepFunction.startExecution).toBeCalledTimes(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('No workflow', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    const event = createDefaultDynamoEvent();
    event.Records[0].dynamodb.NewImage.workflow.S = '';
    await statMachine.handler(event, null, null);
    expect(mockStepFunction.startExecution).toBeCalledTimes(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('Old image exists', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    const event = createDefaultDynamoEvent();
    event.Records[0].dynamodb.OldImage = event.Records[0].dynamodb.NewImage;
    await statMachine.handler(event, null, null);
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

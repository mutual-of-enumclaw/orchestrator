import * as statMachine from './startValidationStateMachine';
import { DynamoDBStreamEvent } from 'aws-lambda';
import { MockWorkflowRegister } from '@moe-tech/orch-metrics-lib/__mock__/dal';

const mockRegister = new MockWorkflowRegister();

class MockStepFunction {
    public called = 0;
    public startExecution (params) {
      this.called++;
      return {
        promise: async () => {
        }
      };
    }

    public reset () {
      this.called = 0;
    }
}

const mockStepFunction = new MockStepFunction();

describe('handler', () => {
  process.env.environment = 'unit-test';
  statMachine.setStepFunctionObject(mockStepFunction as any);
  statMachine.setWorkflowRegister(mockRegister as any);

  test('Null event', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    await statMachine.handler(null, null, null);
    expect(mockStepFunction.called).toBe(0);
    expect(mockRegister.registerInput).toBe(null);
  });

  test('Empty event', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    await statMachine.handler({}, null, null);
    expect(mockStepFunction.called).toBe(0);
    expect(mockRegister.registerInput).toBe(null);
  });

  test('Records null', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    await statMachine.handler({ Records: null }, null, null);
    expect(mockStepFunction.called).toBe(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('Records empty', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    await statMachine.handler({ Records: [] }, null, null);
    expect(mockStepFunction.called).toBe(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('dynamodb not set', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    await statMachine.handler({ Records: [{}] }, null, null);
    expect(mockStepFunction.called).toBe(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('NewImage not set', async () => {
    mockStepFunction.reset();
    await statMachine.handler({ Records: [{ dynamodb: {} }] }, null, null);
    expect(mockStepFunction.called).toBe(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('Valid', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    const event = createDefaultDynamoEvent();
    await statMachine.handler(event, null, null);
    expect(mockStepFunction.called).toBe(1);
    expect(mockRegister.registerInput).toBe('workflow');
  });

  test('No uid', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    const event = createDefaultDynamoEvent();
    event.Records[0].dynamodb.NewImage.uid.S = '';
    await statMachine.handler(event, null, null);
    expect(mockStepFunction.called).toBe(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('No workflow', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    const event = createDefaultDynamoEvent();
    event.Records[0].dynamodb.NewImage.workflow.S = '';
    await statMachine.handler(event, null, null);
    expect(mockStepFunction.called).toBe(0);
    expect(mockRegister.registerInput).toBe(null);
  });
  test('Old image exists', async () => {
    mockStepFunction.reset();
    mockRegister.reset();
    const event = createDefaultDynamoEvent();
    event.Records[0].dynamodb.OldImage = event.Records[0].dynamodb.NewImage;
    await statMachine.handler(event, null, null);
    expect(mockStepFunction.called).toBe(0);
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

describe('unit test utils', () => {
  process.env.environment = 'not unit test';

  test('setStepFunctionObject', () => {
    let error = null;
    try {
      statMachine.setStepFunctionObject(null);
    } catch (err) {
      error = err.message;
    }
    expect(error).toBe('A system is trying to use a unit test capability');
  });

  test('setWorkflowRegister', () => {
    let error = null;
    try {
      statMachine.setStepFunctionObject(null);
    } catch (err) {
      error = err.message;
    }
    expect(error).toBe('A system is trying to use a unit test capability');
  });
});

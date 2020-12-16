import { MockS3 } from '../__mock__/aws';

const bucketName = 'test';
const s3 = new MockS3();

import { WorkflowRegister } from './workflowRegister';
const register = new WorkflowRegister(bucketName);

describe('constructor', () => {
  test('No bucket specified', () => {
    let error = null;
    let register;
    try {
      register = new WorkflowRegister('');
    } catch (err) {
      error = err.message;
    }
    expect(error).toBe('No bucket specified');
    expect(register).toBeUndefined();
  });
});

describe('list', () => {
  test('Null returned', async () => {
    s3.reset();
    s3.listObjectsResults = null;
    let error = null;
    try {
      await register.list();
    } catch (err) {
      error = err.message;
    }

    expect(error).toBe('Result from s3 was invalid');
    expect(s3.listObjectsInput[0].Bucket).toBe(bucketName);
  });

  test('Null returned', async () => {
    s3.reset();
    s3.listObjectsResults = { Contents: null };
    let error = null;
    try {
      await register.list();
    } catch (err) {
      error = err.message;
    }

    expect(error).toBe('Result from s3 was invalid');
    expect(s3.listObjectsInput[0].Bucket).toBe(bucketName);
  });

  test('Empty list', async () => {
    s3.reset();
    s3.listObjectsResults = createListResult();
    s3.listObjectsResults.Contents = [];
    const result = await register.list();

    expect(s3.listObjectsInput[0].Bucket).toBe(bucketName);
    expect(result).toMatchObject([]);
  });

  test('Single Result', async () => {
    s3.reset();
    s3.listObjectsResults = createListResult();
    const result = await register.list();

    expect(s3.listObjectsInput[0].Bucket).toBe(bucketName);
    expect(result).toMatchObject(['test']);
  });

  test('Multiple Results', async () => {
    s3.reset();
    s3.listObjectsResults = createListResult();
    s3.listObjectsResults.Contents.push({ Key: 'test2' });
    const result = await register.list();

    expect(s3.listObjectsInput[0].Bucket).toBe(bucketName);
    expect(result).toMatchObject(['test', 'test2']);
  });

  test('Empty Key', async () => {
    s3.reset();
    s3.listObjectsResults = createListResult();
    s3.listObjectsResults.Contents.push({ Key: '' });
    const result = await register.list();

    expect(s3.listObjectsInput[0].Bucket).toBe(bucketName);
    expect(result).toMatchObject(['test']);
  });
});

describe('register', () => {
  test('Empty workflow', async () => {
    s3.reset();
    let error = null;
    try {
      await register.register('');
    } catch (err) {
      error = err.message;
    }

    expect(error).toBe('Parameter workflow not specified');
  });

  test('Workflow has value w/ space', async () => {
    s3.reset();
    await register.register('workflow test');
    expect(s3.listObjectsInput[0].Bucket).toBe(bucketName);
    expect(s3.listObjectsInput[0].Key).toBe('workflow-test');
    expect(s3.listObjectsInput[0].Body).toBe('');
  });

  test('Workflow has value w/o space', async () => {
    s3.reset();
    await register.register('workflowtest');
    expect(s3.listObjectsInput[0].Bucket).toBe(bucketName);
    expect(s3.listObjectsInput[0].Key).toBe('workflowtest');
    expect(s3.listObjectsInput[0].Body).toBe('');
  });
});

function createListResult () {
  return {
    Contents: [
      {
        Key: 'test'
      }
    ]
  };
}

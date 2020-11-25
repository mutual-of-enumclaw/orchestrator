/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import 'ts-jest';
import { lambdaWrapperAsync, lambdaWrapper, stepLambdaAsyncWrapper } from './epsagonUtils';

const initialFunction = () => { throw new Error('Method called when unexpected'); };
console.log = () => {};

describe('lambdaWrapperAsync', () => {
  test('No epsagon environment variables specified', () => {
    process.env.epsagonToken = '';
    process.env.epsagonAppName = '';
    const result = lambdaWrapperAsync(initialFunction);
    expect(result).toBeDefined();
    expect(result).toBe(initialFunction);
  });

  test('Epsagon environment variables specified', () => {
    process.env.epsagonToken = 'test';
    process.env.epsagonAppName = 'test';
    const result = lambdaWrapperAsync(initialFunction);
    expect(result).toBeDefined();
    expect(result !== initialFunction).toBe(true);
  });
});

describe('stepLambdaAsyncWrapper', () => {
  test('No epsagon environment variables specified', () => {
    process.env.epsagonToken = '';
    process.env.epsagonAppName = '';
    const result = stepLambdaAsyncWrapper(initialFunction);
    expect(result).toBeDefined();
    expect(result).toBe(initialFunction);
  });

  test('Epsagon environment variables specified', () => {
    process.env.epsagonToken = 'test';
    process.env.epsagonAppName = 'test';
    const result = stepLambdaAsyncWrapper(initialFunction);
    expect(result).toBeDefined();
    expect(result !== initialFunction).toBe(true);
  });
});

describe('lambdaWrapper', () => {
  test('No epsagon environment variables specified', () => {
    process.env.epsagonToken = '';
    process.env.epsagonAppName = '';
    const result = lambdaWrapper(initialFunction);
    expect(result).toBeDefined();
    expect(result).toBe(initialFunction);
  });

  test('Epsagon environment variables specified', () => {
    process.env.epsagonToken = 'test';
    process.env.epsagonAppName = 'test';
    const result = lambdaWrapper(initialFunction);
    expect(result).toBeDefined();
    expect(result !== initialFunction).toBe(true);
  });
});

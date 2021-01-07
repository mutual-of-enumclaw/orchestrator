/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { resetConfig } from './config';
import { lambdaWrapper, lambdaWrapperAsync, stepLambdaAsyncWrapper } from './tracingUtils';

const initialFunction = () => { throw new Error('Method called when unexpected'); };
console.log = () => {};

describe('lambdaWrapperAsync', () => {
    beforeEach(() => {
        resetConfig();
    });
    test('No epsagon environment variables specified', () => {
        process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
        const result = lambdaWrapperAsync(initialFunction);
        expect(result).toBeDefined();
        expect(result).toBe(initialFunction);
    });

    test('Epsagon environment variables specified', () => {
        process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable', epsagon: { token: 'test', appName: 'test' } });
        const result = lambdaWrapperAsync(initialFunction);
        expect(result).toBeDefined();
        expect(result !== initialFunction).toBe(true);
    });
});

describe('stepLambdaAsyncWrapper', () => {
    beforeEach(() => {
        resetConfig();
    });
    test('No epsagon environment variables specified', () => {
        process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
        const result = stepLambdaAsyncWrapper(initialFunction);
        expect(result).toBeDefined();
        expect(result).toBe(initialFunction);
    });

    test('Epsagon environment variables specified', () => {
        process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable', epsagon: { token: 'test', appName: 'test' } });
        const result = stepLambdaAsyncWrapper(initialFunction);
        expect(result).toBeDefined();
        expect(result !== initialFunction).toBe(true);
    });
});

describe('lambdaWrapper', () => {
    beforeEach(() => {
        resetConfig();
    });
    test('No epsagon environment variables specified', () => {
        process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
        const result = lambdaWrapper(initialFunction);
        expect(result).toBeDefined();
        expect(result).toBe(initialFunction);
    });

    test('Epsagon environment variables specified', () => {
        process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable', epsagon: { token: 'test', appName: 'test' } });
        const result = lambdaWrapper(initialFunction);
        expect(result).toBeDefined();
        expect(result !== initialFunction).toBe(true);
    });
});

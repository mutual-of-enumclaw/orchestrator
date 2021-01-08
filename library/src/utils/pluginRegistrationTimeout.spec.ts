import { getPluginRegisterTimeout, DEFAULT_PLUGIN_REGISTER_TIMEOUT }
    from './pluginRegistrationTimeout';

describe('getPluginRegisterTimeout', () => {
    test('No workflow timeout', () => {
        const result = getPluginRegisterTimeout(undefined, 'test');
        expect(result).toBe(DEFAULT_PLUGIN_REGISTER_TIMEOUT);
    });

    test('No Timeouts specified', () => {
        const result = getPluginRegisterTimeout({
            activities: {
                test: {
                }
            }
        } as any, 'test');
        expect(result).toBe(DEFAULT_PLUGIN_REGISTER_TIMEOUT);
    });

    test('Activity not found but workflow has timeout', () => {
        const result = getPluginRegisterTimeout({
            activities: {
                test: {
                }
            },
            pluginRegisterTimeout: 20000
        } as any, 'test');
        expect(result).toBe(20000);
    });

    test('Activity timeout', () => {
        const result = getPluginRegisterTimeout({
            activities: {
                test: {
                    pluginRegisterTimeout: 10000
                }
            }
        } as any, 'test');
        expect(result).toBe(10000);
    });

    test('Plugin Timeout', () => {
        const result = getPluginRegisterTimeout({
            activities: {
                test: {}
            }
        } as any, 'test', [{ pluginRegisterTimeout: 10000 }, { pluginRegisterTimeout: 15000 }] as any);
        expect(result).toBe(15000);
    });

    test('Plugin Timeout reversed', () => {
        const result = getPluginRegisterTimeout({
            activities: {
                test: {}
            }
        } as any, 'test', [{ pluginRegisterTimeout: 15000 }, { pluginRegisterTimeout: 10000 }] as any);
        expect(result).toBe(15000);
    });

    test('Prefer higher timeout of activity', () => {
        const result = getPluginRegisterTimeout({
            activities: {
                test: {
                    pluginRegisterTimeout: 10000
                }
            }
        } as any, 'test', [{ pluginRegisterTimeout: 2 }, { pluginRegisterTimeout: 5 }] as any);
        expect(result).toBe(10000);
    });

    test('Prefer higher timeout of workflow', () => {
        const result = getPluginRegisterTimeout({
            activities: {
            },
            pluginRegisterTimeout: 11000
        } as any, 'test', [{ pluginRegisterTimeout: 2 }, { pluginRegisterTimeout: 5 }] as any);
        expect(result).toBe(11000);
    });

    test('Prefer lower timeout of activity over workflow', () => {
        const result = getPluginRegisterTimeout({
            activities: {
                test: {
                    pluginRegisterTimeout: 10000
                }
            },
            pluginRegisterTimeout: 11000
        } as any, 'test', [{ pluginRegisterTimeout: 2 }, { pluginRegisterTimeout: 5 }] as any);
        expect(result).toBe(10000);
    });

    test('No optional plugins, zero timeout', () => {
        const result = getPluginRegisterTimeout({
            activities: {
                test: {}
            }
        } as any, 'test', [{ mandatory: true, pluginRegisterTimeout: 2 }, { mandatory: true, pluginRegisterTimeout: 5 }] as any);
        expect(result).toBe(0);
    });
});

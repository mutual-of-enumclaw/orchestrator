/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
process.env.OrchestratorConfig = JSON.stringify({ statusTable: 'StatusTable' });
import { handler } from './pluginAdd';

describe('processCloudwatchEvent', () => {
    test('Handler', async () => {
        let error = null;
        try {
            await handler(null);
        } catch (err) {
            error = err.message;
        }
        expect(error).toBe('Argument event not valid');
    });
});

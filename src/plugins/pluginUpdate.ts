/**
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { lambdaWrapperAsync, CloudwatchEvent, PluginManagementDal, PluginStorageDefinition } from '@moe-tech/orchestrator';
import { install } from 'source-map-support';

install();
const pluginDal = new PluginManagementDal(process.env.pluginTable);

export const handler = lambdaWrapperAsync(async (event: CloudwatchEvent) => {
    console.log(JSON.stringify(event));

    const functionName = event.detail.responseElements.functionName;
    if (!functionName) {
        return;
    }

    const functionQuery = await pluginDal.getPluginByFunction(functionName);

    await Promise.all(functionQuery.map(async (item: PluginStorageDefinition) => {
        await update(item);
    }));
});

async function update (item: PluginStorageDefinition) {
    console.log('Getting plugin config');
    const result = await pluginDal.getPluginConfig(item);

    console.log('Adding plugin to database');
    const parts = item.orchestratorId.split('|');
    await pluginDal.addPlugin(parts[0], parts[1], item.subscriptionArn, result);

    console.log('Plugin add succeeded');
}

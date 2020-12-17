/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { lambdaWrapperAsync, PluginManager, CloudwatchEvent } from "@moe-tech/orchestrator";
import { getStage } from "./pluginAdd";

export const handler = lambdaWrapperAsync(async (event: CloudwatchEvent) => {
    console.log(JSON.stringify(event));
    const stage = getStage(event);
    const pluginManager = new PluginManager(process.env.activity, stage, process.env.snsArn);

    await pluginManager.removePluginEvent(event);
});

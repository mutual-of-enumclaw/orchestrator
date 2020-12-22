/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { lambdaWrapperAsync, PluginManager, CloudwatchEvent } from "@moe-tech/orchestrator";
import { getStage } from "./pluginAdd";

const arns = [process.env.parallelArn, process.env.postArn, process.env.preArn];

export const handler = lambdaWrapperAsync(async (event: CloudwatchEvent) => {
    console.log(JSON.stringify(event));
    const stage = getStage(event);
    const pluginManager = new PluginManager(process.env.activity, stage, arns);

    await pluginManager.removePluginEvent(event);
});

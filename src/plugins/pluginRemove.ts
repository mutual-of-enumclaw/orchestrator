/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 *
 * The remove plugin is done at the core level as there is no way to limit what
 * subscriptions are triggering this lambda at the SNS topic level, therefore
 * having a single point of unsubscribe makes the most sense
 */

import { lambdaWrapperAsync, CloudwatchEvent, PluginManagementDal } from '@moe-tech/orchestrator';

const pluginDal = new PluginManagementDal(process.env.pluginTable);
export const handler = lambdaWrapperAsync(async (event: CloudwatchEvent) => {
    console.log(JSON.stringify(event));

    if (!event) {
        throw new Error('Argument event not valid');
    }
    if (event.detail.eventName !== 'Unsubscribe') {
        throw new Error('Event type unexpected');
    }
    const subscriptionArn = event.detail.requestParameters?.subscriptionArn;
    if (!subscriptionArn) {
        throw new Error('No subscription arn supplied');
    }

    const subscription = await pluginDal.getPluginBySubscription(subscriptionArn);

    const parts = subscription.orchestratorId.split('|');
    await pluginDal.removePlugin(parts[0], parts[1], subscriptionArn);
});

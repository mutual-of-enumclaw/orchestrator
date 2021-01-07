/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

import { PromiseResult } from 'aws-sdk/lib/request';
import { PublishResponse, MessageAttributeMap } from 'aws-sdk/clients/sns';
import { SNS, AWSError } from 'aws-sdk';

export class SNSUtils {
    private sns: SNS = new SNS();

    constructor (private topicArn) {}

    public async publishWithMetadata (message: any, attributes: any)
        : Promise<PromiseResult<PublishResponse, AWSError>> {
        console.log(`publishWithMetadata message: ${JSON.stringify(message)}`);
        console.log(`publishWithMetadata attributes: ${JSON.stringify(attributes)}`);
        const messageAttributes = {} as MessageAttributeMap;
        if (attributes) {
            for (const key in attributes) {
                const attrib = {} as any;
                const value = attributes[key];
                if (!value) {
                    continue;
                }
                if (typeof value === 'string') {
                    attrib.DataType = 'String';
                }
                if (typeof value === 'number') {
                    attrib.DataType = 'Number';
                }
                if (Array.isArray(value)) {
                    continue;
                }
                attrib.StringValue = value.toString();

                messageAttributes[key] = attrib;
            }
        }

        return await this.sns.publish({
            TopicArn: this.topicArn,
            Message: typeof message === 'string' ? message : JSON.stringify(message),
            MessageAttributes: messageAttributes
        }).promise();
    }

    async getSubscriberCount () {
        const result = await this.sns.listSubscriptionsByTopic({
            TopicArn: this.topicArn
        }).promise();

        if (result == null) {
            throw new Error('Could not retrieve information on topic');
        }
        if (result.$response.error) {
            throw result.$response.error;
        }
        if (!result.Subscriptions) {
            return 0;
        }
        return result.Subscriptions.length;
    }
}

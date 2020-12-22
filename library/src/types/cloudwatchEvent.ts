/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */

export interface CloudwatchEvent {
    version: string;
    id: string;
    'detail-type': string;
    source: string;
    account: string;
    time: string;
    region: string;
    resources: Array<string>;
    detail: CloudwatchEventDetails;
}

export interface CloudwatchEventDetails {
    eventVersion: string;
    userIdentity: CloudwatchUserIdentity;
    eventTime: string;
    eventSource: string;
    eventName: string;
    awsRegion: string;
    sourceIPAddress: string;
    userAgent: string;
    requestParameters: CloudwatchRequestParameters;
    responseElements: CloudwatchResponseElements;
    requestID: string;
    eventID: string;
    eventType: string;
}

export interface CloudwatchResponseElements {
    subscriptionArn: string;
    functionName: string;
}

export interface CloudwatchRequestParameters {
    returnSubscriptionArn: boolean;
    topicArn: string;
    protocol: string;
    endpoint: string;
    subscriptionArn: string;
}

export interface CloudwatchUserIdentity {
    type: string;
    principalId: string;
    arn: string;
    accountId: string;
    accessKeyId: string;
    userName: string;
    sessionContext: any;
    invokedBy: string;
}

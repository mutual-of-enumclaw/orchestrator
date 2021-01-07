/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import * as epsagon from 'epsagon';
import { Context } from 'aws-lambda';
import { getConfig } from './config';

if (getConfig().epsagon) {
    epsagon.init({
        token: getConfig().epsagon.token,
        appName: getConfig().epsagon.appName,
        metadataOnly: getConfig().epsagon.metadataOnly
    });
}

export function registerObservableError (err) {
    if (getConfig().epsagon) {
        epsagon.setError(err);
    }
}

export function setLabel (name: string, value: string) {
    if (getConfig().epsagon) {
        epsagon.label(name, value);
    }
}

export const lambdaWrapper = (method) => {
    if (!getConfig().epsagon) {
        return method;
    }
    return epsagon.lambdaWrapper(method);
};

export const lambdaWrapperAsync = (method) => {
    if (!getConfig().epsagon) {
        console.log('Using no epsagon wrapper');
        return method;
    }
    return epsagon.lambdaWrapper((event, context: Context, callback) => {
        method(event, context, callback)
            .then((result) => {
                callback(null, result);
            })
            .catch((err) => {
                callback(err);
            });
    });
};

export const stepLambdaAsyncWrapper = (method) => {
    if (!getConfig().epsagon) {
        console.log('Using no epsagon wrapper');
        return method;
    }
    return epsagon.stepLambdaWrapper((event, context: Context, callback) => {
        method(event, context, callback)
            .then((result) => {
                callback(null, result);
            })
            .catch((err) => {
                callback(err);
            });
    });
};

export function setError (error: Error) {
    if (!getConfig().epsagon) {
        return;
    }
    epsagon.setError(error);
}

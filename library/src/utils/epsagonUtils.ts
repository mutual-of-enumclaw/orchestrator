/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import * as epsagon from 'epsagon';
import { Context } from 'aws-lambda';

if (process.env.epsagonToken) {
  epsagon.init({
    token: process.env.epsagonToken,
    appName: process.env.epsagonAppName,
    metadataOnly: process.env.epsagonMetadata === 'false'
  });
}

export function registerObservableError (err) {
  if (process.env.epsagonToken) {
    epsagon.setError(err);
  }
}

export function setLabel (name: string, value: string) {
  if (process.env.epsagonToken) {
    epsagon.label(name, value);
  }
}

export const lambdaWrapper = (method) => {
  if (!process.env.epsagonToken) {
    return method;
  }
  return epsagon.lambdaWrapper(method);
};

export const lambdaWrapperAsync = (method) => {
  if (!process.env.epsagonToken) {
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
  if (!process.env.epsagonToken) {
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
  if (!process.env.epsagonToken) {
    return;
  }
  epsagon.setError(error);
}

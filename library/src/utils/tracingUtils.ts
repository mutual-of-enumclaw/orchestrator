/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import * as epsagon from 'epsagon';
import { Context } from 'aws-lambda';
import { OrchestratorConfig } from '../types';

const config: OrchestratorConfig = process.env.OrchestratorConfig? JSON.parse(process.env.OrchestratorConfig) : {};

if (config.epsagon) {
  epsagon.init({
    token: config.epsagon.token,
    appName: config.epsagon.appName,
    metadataOnly: config.epsagon.metadataOnly
  });
}

export function registerObservableError (err) {
  if (config.epsagon) {
    epsagon.setError(err);
  }
}

export function setLabel (name: string, value: string) {
  if (config.epsagon) {
    epsagon.label(name, value);
  }
}

export const lambdaWrapper = (method) => {
  if (!config.epsagon) {
    return method;
  }
  return epsagon.lambdaWrapper(method);
};

export const lambdaWrapperAsync = (method) => {
  if (!config.epsagon) {
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
  if (!config.epsagon) {
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
  if (!config.epsagon) {
    return;
  }
  epsagon.setError(error);
}

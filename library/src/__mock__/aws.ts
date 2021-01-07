export class MockS3 {
  public listObjectsV2 = jest.fn();
  public listObjectsResults = null;
  public listObjectsInput: any[] = [];
  public putObject = jest.fn();
  public putObjectInput: any[] = [];

  constructor (S3Class) {
      S3Class.prototype.listObjectsV2 = this.listObjectsV2;
      S3Class.prototype.putObject = this.putObject;
  }

  reset () {
      this.listObjectsResults = null;
      this.listObjectsInput = [];
      this.listObjectsV2.mockReset();
      this.listObjectsV2.mockImplementation((params) => {
          this.listObjectsInput.push(params);
          return {
              promise: async () => {
                  return this.listObjectsResults;
              }
          }
      });

      this.putObjectInput = [];
      this.putObject.mockReset();
      this.putObject.mockImplementation((params) => {
          this.putObjectInput.push(params);
          return {
              promise: async () => {}
          }
      });
  }
}

export class MockDynamoDb {
  public getReturn: any;
  public queryReturn: Array<any>;
  public error: string;
  public updateReturn: any;
  public updateInputs: any[];
  public deleteInput: any;
  public putInput: any = null;
  public scanReturn: any = null;
  public get = jest.fn();
  public put = jest.fn();
  public query = jest.fn();
  public scan = jest.fn();
  public update = jest.fn();
  public delete = jest.fn();

  constructor (dynamoClass) {
      dynamoClass.prototype.get = this.get;
      dynamoClass.prototype.put = this.put;
      dynamoClass.prototype.query = this.query;
      dynamoClass.prototype.scan = this.scan;
      dynamoClass.prototype.update = this.update;
      dynamoClass.prototype.delete = this.delete;
  }

  public reset () {
      this.error = '';
      this.updateReturn = null;
      this.updateInputs = [];
      this.scanReturn = null;
      this.queryReturn = null;
      this.getReturn = null;
      this.deleteInput = null;
      this.putInput = null;

      this.get.mockReset();
      this.get.mockImplementation((params) => {
          return {
              promise: async () => {
                  return {
                      $response: {
                          error: this.error
                      },
                      Item: this.getReturn
                  };
              }
          };
      });

      this.put.mockReset();
      this.put.mockImplementation((params) => {
          this.putInput = params;
          return {
              promise: async () => {
                  return {
                      $response: {
                          error: this.error
                      }
                  };
              }
          };
      });

      this.query.mockReset();
      this.query.mockImplementation((params) => {
          return {
              promise: async () => {
                  return {
                      $response: {
                          error: this.error
                      },
                      Items: this.queryReturn
                  };
              }
          };
      });

      this.scan.mockReset();
      this.scan.mockImplementation((scanParams: any) => {
          return {
              promise: async () => {
                  return {
                      $response: {
                          error: this.error
                      },
                      ...this.scanReturn
                  };
              }
          }
      });

      this.update.mockReset();
      this.update.mockImplementation((updateParams: any) => {
          this.updateInputs.push(updateParams);
          return {
              promise: async () => {
                  return {
                      $response: {
                          error: this.error
                      },
                      ...this.updateReturn
                  };
              }
          };
      });

      this.delete.mockReset();
      this.delete.mockImplementation((deleteParams: any) => {
          this.deleteInput = deleteParams;
          return {
              promise: async () => {}
          };
      });
  }
}

export class MockLambda {
  public invokeRetval: any = {};
  public invokeParams = [];
  public invoke = jest.fn();

  constructor (lambdaClass) {
      lambdaClass.prototype.invoke = this.invoke;
  }

  public reset () {
      this.invokeRetval = {};
      this.invokeParams = [];

      this.invoke.mockReset();
      this.invoke.mockImplementation((params) => {
          this.invokeParams.push(params);
          return {
              promise: async () => {
                  if (this.invokeRetval.FunctionError) {
                      throw new Error(this.invokeRetval.FunctionError);
                  }
                  return this.invokeRetval;
              }
          };
      });
  }
}

export class MockSNS {
  public publishRetval = {};
  public publishInput = null;
  public listResponse = null;
  public listNullResponse = false;
  public error = null;
  public publish = jest.fn();
  public listSubscriptionsByTopic = jest.fn();

  constructor (snsClass) {
      snsClass.prototype.publish = this.publish;
      snsClass.prototype.listSubscriptionsByTopic = this.listSubscriptionsByTopic;
  }

  reset () {
      this.error = null;
      this.publishRetval = {};
      this.publishInput = null;
      this.listResponse = undefined;
      this.listNullResponse = false;

      this.publish.mockReset();
      this.publish.mockImplementation((params) => {
          this.publishInput = params;
          return {
              promise: async () => {
                  return this.publishRetval;
              }
          };
      });

      this.listSubscriptionsByTopic.mockReset();
      this.listSubscriptionsByTopic.mockImplementation((params) => {
          return {
              promise: async () => {
                  if (this.listNullResponse) {
                      return null;
                  }
                  return {
                      $response: {
                          error: this.error
                      },
                      Subscriptions: this.listResponse
                  };
              }
          };
      });
  }
}

export class MockStepFunctions {
  sendTaskSuccess = jest.fn();
  startExecution = jest.fn();
  sendTaskFailure = jest.fn();

  constructor (stepFunctionClass) {
      stepFunctionClass.prototype.sendTaskSuccess = this.sendTaskSuccess;
      stepFunctionClass.prototype.startExecution = this.startExecution;
      stepFunctionClass.prototype.sendTaskFailure = this.sendTaskFailure;
  }

  reset () {
      this.sendTaskSuccess.mockReset();
      this.sendTaskSuccess.mockImplementation((input) => {
          return {
              promise: async () => {}
          };
      });

      this.startExecution.mockReset();
      this.startExecution.mockImplementation((params) => {
          return {
              promise: async () => {
              }
          };
      });

      this.sendTaskFailure.mockReset();
      this.sendTaskFailure.mockImplementation(() => {
          return {
              promise: async () => {}
          };
      });
  }
}

export class MockCloudwatch {
  public putMetricParams: any;

  public putMetricData = jest.fn();

  constructor (CloudWatchClass) {
      CloudWatchClass.prototype.putMetricData = this.putMetricData;
  }

  reset () {
      this.putMetricData.mockReset();
      this.putMetricData.mockImplementation((params) => {
          this.putMetricParams = params;
          return {
              promise: async () => {}
          };
      });
  }
}

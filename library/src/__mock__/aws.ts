import { CloudWatch, DynamoDB, Lambda, SNS, StepFunctions } from 'aws-sdk';

export class MockDynamoDb {
  public getReturn: any;
  public queryReturn: Array<any>;
  public error: string;
  public updateReturn: any;
  public updateInput: any;
  public deleteInput: any;
  public putInput: any = null;
  public scanReturn: any = null;
  public get = jest.fn();
  public put = jest.fn();
  public query = jest.fn();
  public scan = jest.fn();
  public update = jest.fn();
  public delete = jest.fn();

  constructor() {
      DynamoDB.DocumentClient.prototype.get = this.get;
      DynamoDB.DocumentClient.prototype.put = this.put;
      DynamoDB.DocumentClient.prototype.query = this.query;
      DynamoDB.DocumentClient.prototype.scan = this.scan;
      DynamoDB.DocumentClient.prototype.update = this.update;
      DynamoDB.DocumentClient.prototype.delete = this.delete;
  }

  public reset () {
    this.error = '';
    this.updateReturn = null;
    this.updateInput = null;
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
      this.updateInput = updateParams;
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
  public invokeRetval = {};
  public invokeParams = [];
  public invoke = jest.fn();

  constructor() {
      Lambda.prototype.invoke = this.invoke;
  }

  public reset () {
    this.invokeRetval = {};
    this.invokeParams = [];

    this.invoke.mockReset();
    this.invoke.mockImplementation((params) => {
      this.invokeParams.push(params);
      return {
        promise: async () => {
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

  constructor() {
      SNS.prototype.publish = this.publish;
      SNS.prototype.listSubscriptionsByTopic = this.listSubscriptionsByTopic;
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

  constructor() {
      StepFunctions.prototype.sendTaskSuccess = this.sendTaskSuccess;
  }

  reset () {
    this.sendTaskSuccess.mockReset();
    this.sendTaskSuccess.mockImplementation((input) => {
      return {
        promise: async () => {}
      };
    });
  }
}

export class MockCloudwatch {
  public putMetricParams: any;

  public putMetricData = jest.fn();

  constructor() {
    CloudWatch.prototype.putMetricData = this.putMetricData;
  }

  reset() {
    this.putMetricData.mockReset();
    this.putMetricData.mockImplementation((params) => {
      this.putMetricParams = params;
      return {
        promise: async () => {}
      };
    });
  }
}
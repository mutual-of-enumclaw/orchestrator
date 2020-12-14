import { DynamoDB, Lambda, SNS, StepFunctions } from 'aws-sdk';

export class MockDynamoDb {
    public returnObject: any;
    public queryReturn: Array<any>;
    public error: string;
    public scanReturn: any = null;
    public updateReturn: any;
    public updateInput: any;
    public deleteInput: any;

    constructor() {
        DynamoDB.DocumentClient.prototype.get = jest.fn((params) => {
            return this.get(params);
        });
        DynamoDB.DocumentClient.prototype.put = jest.fn((params) => {
            return this.put(params);
        });
        DynamoDB.DocumentClient.prototype.query = jest.fn((params) => {
            return this.query(params);
        });
        DynamoDB.DocumentClient.prototype.scan = jest.fn((params) => {
            return this.scan(params);
        });
        DynamoDB.DocumentClient.prototype.update = jest.fn((params) => {
            return this.update(params);
        });
        DynamoDB.DocumentClient.prototype.delete = jest.fn((params) => {
            return this.delete(params);
        });
    }

    public reset () {
      this.error = '';
      this.updateReturn = null;
      this.updateInput = null;
      this.scanReturn = null;
      this.queryReturn = null;
      this.returnObject = null;
      this.deleteInput = null;
    }

    public get (params) : any {
      return {
        promise: () => {
          return new Promise((resolve, reject) => {
            resolve({
              $response: {
                error: this.error
              },
              Item: this.returnObject
            });
          });
        }
      };
    }

    public put (params) : any {
      return {
        promise: () => {
          return new Promise((resolve, reject) => {
            resolve({
              $response: {
                error: this.error,
                data: this.returnObject
              }
            });
          });
        }
      };
    }

    public query (params) : any {
      return {
        promise: () => {
          return new Promise((resolve, reject) => {
            resolve({
              $response: {
                error: this.error
              },
              Items: this.queryReturn
            });
          });
        }
      };
    }

    public scan (scanParams: any): any {
      return {
        promise: () => {
          return new Promise((resolve, reject) => {
            resolve({
              $response: {
                error: this.error
              },
              ...this.scanReturn
            });
          });
        }
      };
    }

    public update (updateParams: any): any {
      this.updateInput = updateParams;
      return {
        promise: () => {
          return new Promise((resolve, reject) => {
            resolve({
              $response: {
                error: this.error
              },
              ...this.updateReturn
            });
          });
        }
      };
    }

    public delete (deleteParams: any): any {
      this.deleteInput = deleteParams;
      return {
        promise: async () => {}
      };
    }
}

export class MockLambda {
    public invokeRetval = {};
    public invokeParams = [];

    constructor() {
        Lambda.prototype.invoke = jest.fn((params) => {
            return this.invoke(params);
        }) as any;
    }

    public reset () {
      this.invokeRetval = {};
      this.invokeParams = [];
    }

    public invoke (params) {
      this.invokeParams.push(params);
      return {
        promise: () => {
          return new Promise((resolve) => {
            resolve(this.invokeRetval);
          });
        }
      };
    }
}

export class MockSNS {
    public publishRetval = {};
    public publishInput = null;
    public listResponse = null;
    public listNullResponse = false;
    public error = null;

    constructor() {
        SNS.prototype.publish = jest.fn((params) => {
            return this.publish(params);
        }) as any;
        SNS.prototype.listSubscriptionsByTopic = jest.fn((params) => {
            return this.listSubscriptionsByTopic(params);
        }) as any;
    }

    reset () {
      this.error = null;
      this.publishRetval = {};
      this.publishInput = null;
      this.listResponse = undefined;
      this.listNullResponse = false;
    }

    publish (params) {
      this.publishInput = params;
      return {
        promise: () => {
          return new Promise((resolve, reject) => {
            resolve(this.publishRetval);
          });
        }
      };
    }

    listSubscriptionsByTopic (params) {
      return {
        promise: () => {
          return new Promise((resolve, reject) => {
            if (this.listNullResponse) {
              resolve(null);
              return;
            }
            resolve({
              $response: {
                error: this.error
              },
              Subscriptions: this.listResponse
            });
          });
        }
      };
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
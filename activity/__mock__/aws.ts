export class MockDynamoDb {
    public returnObject: any;
    public queryReturn: Array<any>;
    public error: string;
    public scanReturn: any = null;
    public updateReturn: any;
    public updateInput: any;
    public deleteInput: any;

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
        promise: () => {
          return new Promise((resolve) => {
            resolve();
          });
        }
      };
    }
}

export class MockLambda {
    public invokeRetval = {};
    public invokeParams = [];

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

    reset () {
      this.sendTaskSuccess.mockReset();
      this.sendTaskSuccess.mockImplementation((input) => {
        return {
          promise: () => {
            return new Promise((resolve) => {
              resolve();
            });
          }
        };
      });
    }
}

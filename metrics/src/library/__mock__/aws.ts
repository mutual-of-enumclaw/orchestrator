export class MockDynamoDb {
    public deleteCount: number = 0;
    public deleteRetval: any = null;
    public putCount: number = 0;
    public putRetval: any = null;
    public putInput: any = null;
    public scanRetval: any = null;
    public scanParams: any = null;
    public reset () {
      this.deleteCount = 0;
      this.putCount = 0;
      this.scanParams = null;
      this.scanRetval = null;
    }

    public delete (params) {
      this.deleteCount++;
      return {
        promise: async () => {
          return this.deleteRetval;
        }
      };
    }

    public put (params) {
      this.putCount++;
      this.putInput = params;
      return {
        promise: async () => {
          return this.putRetval;
        }
      };
    }

    public scan (params) {
      this.scanParams = params;
      return {
        promise: async () => {
          return this.scanRetval;
        }
      };
    }
}

export class MockSns {
    public called = 0;
    public reset () {
      this.called = 0;
    }

    public publish () {
      this.called++;
      return {
        promise: async () => {
          return {};
        }
      };
    }
}

export class MockCloudwatch {
    public called = 0;
    public putMetricParams: any = null;
    public reset () {
      this.called = 0;
      this.putMetricParams = null;
    }

    public putMetricData (params) {
      this.putMetricParams = params;
      this.called++;
      return {
        promise: async () => {
          return {};
        }
      };
    }
}

export class MockDynamoDal {
    public deleteCount: number = 0;
    public deleteRetval: any = null;
    public putCount: number = 0;
    public putRetval: any = null;
    public putInput: any = null;
    public scanRetval: any = null;
    public scanParams: any = null;
    public reset () {
      this.deleteCount = 0;
      this.putCount = 0;
      this.scanParams = null;
      this.scanRetval = null;
    }

    public async delete (params) {
      this.deleteCount++;
      return this.deleteRetval;
    }

    public put (params) {
      this.putCount++;
      this.putInput = params;
      return this.putRetval;
    }

    public async scan (params) {
      this.scanParams = params;
      return this.scanRetval;
    }
}

export class MockS3 {
    public putInput = null;
    public listResult = null;
    public listInput = null;

    public reset () {
      this.putInput = null;
      this.listResult = null;
      this.listInput = null;
    }

    public putObject (params) {
      this.putInput = params;
      return {
        promise: async () => {}
      };
    }

    public listObjectsV2 (params) {
      this.listInput = params;
      const retval = this.listResult;
      return {
        promise: () => {
          return new Promise((resolve) => {
            resolve(retval);
          });
        }
      };
    }
}

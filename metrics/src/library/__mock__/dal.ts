export class MockMetricsDb {
    public putIssueFailureCallCount: number = 0;
    public getIssueFailureCountRetval: Array<any> = [];
    public getIssueFailureCountCallCount: number = 0;
    public reset () {
      this.putIssueFailureCallCount = 0;
      this.getIssueFailureCountCallCount = 0;
      this.getIssueFailureCountRetval = [];
    }

    public async putIssueFailure (uid: string) {
      this.putIssueFailureCallCount++;
    }

    public async getIssueFailures () {
      this.getIssueFailureCountCallCount++;
      return this.getIssueFailureCountRetval;
    }
}

export class MockMetricReporting {
    public reportFailuresInput: Array<any> = [];
    public reportFailuresCount: number = 0;
    public reset () {
      this.reportFailuresCount = 0;
      this.reportFailuresInput = [];
    }

    public reportFailures (workflow, count: number) {
      this.reportFailuresCount++;
      this.reportFailuresInput.push({ workflow, count });
    }
}

export class MockWorkflowRegister {
    public listResult = [];
    public listCalls = 0;
    public registerInput = null;

    public reset () {
      this.listResult = [];
      this.listCalls = 0;
      this.registerInput = null;
    }

    public async list () : Promise<Array<string>> {
      this.listCalls++;
      return this.listResult;
    }

    public async register (workflow: string) {
      this.registerInput = workflow;
    }
}

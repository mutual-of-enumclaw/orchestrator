import { OrchestratorStatusDal } from '../dataAccessLayers/orchestratorStatusDal';
import { OrchestratorComponentState, OrchestratorStage } from '../types';
import { MetricsDb } from '../dataAccessLayers/metricsDb';
import { MetricsReporting, WorkflowRegister } from '../utils';

export class MockMetricsDb {
    public putIssueFailureCallCount: number = 0;
    public getIssueFailureCountRetval: Array<any> = [];
    public getIssueFailureCountCallCount: number = 0;
    public putIssueFailure = jest.fn();
    public getIssueFailures = jest.fn();

    constructor() {
        MetricsDb.prototype.putIssueFailure = this.putIssueFailure;
        MetricsDb.prototype.getIssueFailures = this.getIssueFailures;
    }
    public reset () {
      this.putIssueFailure.mockReset();

      this.getIssueFailureCountRetval = [];
      this.getIssueFailures.mockReset();
      this.getIssueFailures.mockImplementation(async () => {
        return this.getIssueFailureCountRetval;
      });
    }
}

export class MockMetricReporting {
    public reportFailuresInput: Array<any> = [];
    public reportFailures = jest.fn();

    constructor() {
        MetricsReporting.prototype.reportFailures = this.reportFailures;
    }

    public reset () {
      this.reportFailuresInput = [];
      this.reportFailures.mockReset();
      this.reportFailures.mockImplementation((workflow, count: number) => {
        this.reportFailuresInput.push({ workflow, count });
      });
    }
}

export class MockWorkflowRegister {
    public listResult = [];
    public listCalls = 0;
    public registerInput = null;
    public list = jest.fn();
    public register = jest.fn();

    constructor() {
        WorkflowRegister.prototype.list = this.list;
        WorkflowRegister.prototype.register = this.register;
    }

    public reset () {
      this.listResult = [];
      this.list.mockReset();
      this.list.mockImplementation(async () => {
          return this.listResult;
      });

      this.registerInput = null;
      this.register.mockReset();
      this.register.mockImplementation(async (workflow: string) => {
        this.registerInput = workflow;
      })
    }
}

export class MockOrchstratorStatusDal {
  public getStatusObject = jest.fn();
  public updatePluginStatus = jest.fn();
  public updatePluginStatusInput: any[] = [];
  public updateStageStatus = jest.fn();

  constructor() {
    OrchestratorStatusDal.prototype.getStatusObject = this.getStatusObject;
    OrchestratorStatusDal.prototype.updatePluginStatus = this.updatePluginStatus;
    OrchestratorStatusDal.prototype.updateStageStatus = this.updateStageStatus;
  }

  reset() {
    this.updatePluginStatusInput = [];
    this.updatePluginStatus.mockReset();
    this.updatePluginStatus.mockImplementation(async (uid: string, workflow: string, activity: string, stage: OrchestratorStage, mandatory: boolean, pluginName: string, state: OrchestratorComponentState, message: string) => {
      this.updatePluginStatusInput.push({
        uid,
        workflow,
        activity,
        stage,
        mandatory,
        pluginName,
        state,
        message
      });
    });

    this.getStatusObject.mockReset();
    this.getStatusObject.mockImplementation(async () => {

    });
  }
}
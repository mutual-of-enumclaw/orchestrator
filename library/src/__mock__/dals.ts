import { OrchestratorComponentState, OrchestratorStage } from '../types';
import { MetricsReporting, WorkflowRegister } from '../utils';
import { OrchestratorPluginDal, OrchestratorStatusDal } from '../dataAccessLayers';

export class MockMetricsDb {
    public putIssueFailureCallCount: number = 0;
    public getIssueFailureCountRetval: Array<any> = [];
    public getIssueFailureCountCallCount: number = 0;
    public putIssueFailure = jest.fn();
    public getIssueFailures = jest.fn();

    constructor (MetricsDbClass) {
        MetricsDbClass.prototype.putIssueFailure = this.putIssueFailure;
        MetricsDbClass.prototype.getIssueFailures = this.getIssueFailures;
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

    constructor (reportingClass = undefined) {
        if (!reportingClass) {
            reportingClass = MetricsReporting;
        }
        reportingClass.prototype.reportFailures = this.reportFailures;
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

    constructor (workflowClass) {
        if (!workflowClass) {
            workflowClass = WorkflowRegister;
        }
        workflowClass.prototype.list = this.list;
        workflowClass.prototype.register = this.register;
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

export class MockOrchestratorStatusDal {
  public getStatusObjectInput = null;
  public getStatusObjectResult = null;
  public getSyncPluginsCalls = 0;
  public getSyncPluginsRetval: any[] = [];
  public updateStageStatusInput: any[] = [];
  public updatePluginStatusInput: any[] = [];
  public getStatusObject = jest.fn();
  public updatePluginStatus = jest.fn();
  public updateStageStatus = jest.fn();

  constructor (statusClass = null) {
      if (!statusClass) {
          statusClass = OrchestratorStatusDal;
      }
      statusClass.prototype.getStatusObject = this.getStatusObject;
      statusClass.prototype.updatePluginStatus = this.updatePluginStatus;
      statusClass.prototype.updateStageStatus = this.updateStageStatus;
  }

  public reset () {
      this.getStatusObjectInput = null;
      this.getStatusObjectResult = null;
      this.getSyncPluginsCalls = 0;
      this.getSyncPluginsRetval = [];
      this.updateStageStatusInput = [];
      this.updatePluginStatusInput = [];

      this.getStatusObject.mockReset();
      this.getStatusObject.mockImplementation(async (uid: string, activity: string) => {
          this.getStatusObjectInput = { uid, activity };
          return this.getStatusObjectResult;
      });

      this.updatePluginStatus.mockReset();
      this.updatePluginStatus.mockImplementation((uid: string, workflow: string, activity: string, stage: OrchestratorStage,
          mandatory: boolean, pluginName: string, state: OrchestratorComponentState,
          message: string) => {
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

      this.updateStageStatus.mockReset();
      this.updateStageStatus.mockImplementation((uid: string, workflow: string, activity: string, stage: OrchestratorStage,
          state: OrchestratorComponentState, message: string) => {
          this.updateStageStatusInput.push({
              uid,
              workflow,
              activity,
              stage,
              state,
              message
          });
      });
  }
}

export class MockOrchestratorPluginDal {
  getPlugins = jest.fn();
  getPluginsResults: any[] = [];

  constructor (pluginDalClass = null) {
      if (!pluginDalClass) {
          pluginDalClass = OrchestratorPluginDal;
      }
      pluginDalClass.prototype.getPlugins = this.getPlugins;
  }

  reset () {
      this.getPluginsResults = [];
      this.getPlugins.mockReset();
      this.getPlugins.mockImplementation(async () => {
          return this.getPluginsResults;
      });
  }
}

export class MockPluginManagementDal {
  public addPluginInput: Array<any> = [];
  public removePluginInput: Array<any> = [];

  public removePlugin = jest.fn();
  public addPlugin = jest.fn();
  public getPluginBySubscription = jest.fn();
  public getPluginConfig = jest.fn();
  public getPluginByFunction = jest.fn();

  constructor (PluginManagementDalClass) {
      PluginManagementDalClass.prototype.addPlugin = this.addPlugin;
      PluginManagementDalClass.prototype.removePlugin = this.removePlugin;
      PluginManagementDalClass.prototype.getPluginBySubscription = this.getPluginBySubscription;
      PluginManagementDalClass.prototype.getPluginConfig = this.getPluginConfig;
      PluginManagementDalClass.prototype.getPluginByFunction = this.getPluginByFunction;
  }

  public reset () {
      this.addPluginInput = [];
      this.removePluginInput = [];

      this.addPlugin.mockReset();
      this.addPlugin.mockImplementation((subscriptionArn, params: any) => {
          this.addPluginInput.push({
              subscriptionArn,
              ...params
          });
      });

      this.removePlugin.mockReset();
      this.removePlugin.mockImplementation((subscriptionArn) => {
          this.removePluginInput.push({
              subscriptionArn
          });
      });
      this.getPluginBySubscription.mockReset();
      this.getPluginConfig.mockReset();
      this.getPluginByFunction.mockReset();
  }
}

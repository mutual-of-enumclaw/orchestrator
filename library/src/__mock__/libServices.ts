import { PluginManagementDal, SNSUtils } from '../utils';
import { OrchestratorStage, OrchestratorComponentState, OrchestratorSyncPlugin } from '../types';
import { OrchestratorPluginDal } from '../dataAccessLayers/orchestratorPluginDal';
import { OrchestratorStatusDal } from '../dataAccessLayers/orchestratorStatusDal';

export class MockSNSUtils {
    public subscriberCount: number;
    public publishWithMetadataInput;
    public publishWithMetadataRetval;
    public publishWithMetadataCallCount;
    public getSubscriberCount = jest.fn();
    public publishWithMetadata = jest.fn();

    constructor() {
      SNSUtils.prototype.getSubscriberCount = this.getSubscriberCount;
      SNSUtils.prototype.publishWithMetadata = this.publishWithMetadata;
    }

    reset () {
      this.subscriberCount = 1;
      this.publishWithMetadataInput = [];
      this.publishWithMetadataRetval = null;

      this.getSubscriberCount.mockReset();
      this.getSubscriberCount.mockImplementation(() => {
        return this.subscriberCount;
      });

      this.publishWithMetadata.mockReset();
      this.publishWithMetadata.mockImplementation((message, metadata) => {
        this.publishWithMetadataInput.push({
          message,
          metadata
        });
        return this.publishWithMetadataRetval;
      });
    }
}

export class MockOrchestratorPluginDal {
  public getPlugins = jest.fn();
  public getPluginsResults: OrchestratorSyncPlugin[];

  constructor() {
    OrchestratorPluginDal.prototype.getPlugins = this.getPlugins;
  }

  public reset () {
    this.getPluginsResults = [{
      functionName: 'test',
      pluginName: 'test',
      mandatory: true,
      order: 1
    } as any];

    this.getPlugins.mockReset();
    this.getPlugins.mockImplementation(async () => {
      return this.getPluginsResults;
    });
  }
}

export class MockOrchestratorStatusDal {
  public getStatusObjectInput = null;
  public getStatusObjectResult = null;
  public getSyncPluginsCalls = 0;
  public getSyncPluginsRetval = [];
  public updateStageStatusInput = null;
  public updatePluginStatusInput = null;
  public getStatusObject = jest.fn();
  public updatePluginStatus = jest.fn();
  public updateStageStatus = jest.fn();

  constructor() {
    OrchestratorStatusDal.prototype.getStatusObject = this.getStatusObject;
    OrchestratorStatusDal.prototype.updatePluginStatus = this.updatePluginStatus;
    OrchestratorStatusDal.prototype.updateStageStatus = this.updateStageStatus;
  }

  public reset () {
    this.getStatusObjectInput = null;
    this.getStatusObjectResult = null;
    this.getSyncPluginsCalls = 0;
    this.getSyncPluginsRetval = [];
    this.updateStageStatusInput = null;
    this.updatePluginStatusInput = null;

    this.getStatusObject.mockReset();
    this.getStatusObject.mockImplementation(async (uid: string, activity: string) => {
      this.getStatusObjectInput = { uid, activity };
      return this.getStatusObjectResult;
    });

    this.updatePluginStatus.mockReset();
    this.updatePluginStatus.mockImplementation((uid: string, workflow: string, activity: string, stage: OrchestratorStage,
                                      mandatory: boolean, pluginName: string, state: OrchestratorComponentState,
                                      message: string) => {
        this.updatePluginStatusInput = {
          uid,
          workflow,
          activity,
          stage,
          mandatory,
          pluginName,
          state,
          message
        };
      });

      this.updateStageStatus.mockReset();
      this.updateStageStatus.mockImplementation((uid: string, workflow: string, activity: string, stage: OrchestratorStage,
                                                state: OrchestratorComponentState, message: string) => {
        this.updateStageStatusInput = {
          uid,
          workflow,
          activity,
          stage,
          state,
          message
        };
      })
  }
}

export class MockMakeLambdaCallWrapper {
  static calls = [];
  static retval = {};
  static error = '';
  public calls = MockMakeLambdaCallWrapper.calls;
  public MakeLambdaCallRetval: any = MockMakeLambdaCallWrapper.retval;

  public reset () {
    MockMakeLambdaCallWrapper.calls = [];
    this.calls = MockMakeLambdaCallWrapper.calls;
    MockMakeLambdaCallWrapper.error = null;
    MockMakeLambdaCallWrapper.retval = { StatusCode: 200 };
    this.MakeLambdaCallRetval = MockMakeLambdaCallWrapper.retval;
  }

  public setError (error) {
    MockMakeLambdaCallWrapper.error = error;
  }

  public async MakeLambdaCall<T> (event: string, functionName: string, config: any) {
    MockMakeLambdaCallWrapper.calls.push({ event, functionName });
    if (MockMakeLambdaCallWrapper.error) {
      throw MockMakeLambdaCallWrapper.error;
    }

    return MockMakeLambdaCallWrapper.retval;
  }
}

export class MockPluginManagementDal {
  public addPluginInput: Array<any> = [];
  public removePluginInput: Array<any> = [];

  public removePlugin = jest.fn();
  public addPlugin = jest.fn();

  constructor() {
    PluginManagementDal.prototype.addPlugin = this.addPlugin;
    PluginManagementDal.prototype.removePlugin = this.removePlugin;
  }

  public reset () {
    this.addPluginInput = [];
    this.removePluginInput = [];

    this.addPlugin.mockReset();
    this.addPlugin.mockImplementation((subscriptionArn) => {
      this.removePluginInput.push({ subscriptionArn });
    });

    this.removePlugin.mockReset();
    this.removePlugin.mockImplementation((subscriptionArn, params: any) => {
      this.addPluginInput.push({
        subscriptionArn,
        ...params
      });
    });
  }
}
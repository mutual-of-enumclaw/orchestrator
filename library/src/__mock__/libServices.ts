import { OrchestratorStage, OrchestratorComponentState, OrchestratorSyncPlugin } from '..';

export class MockSNSUtils {
    public subscriberCount: number;
    public publishWithMetadataInput;
    public publishWithMetadataRetval;
    public publishWithMetadataCallCount;

    reset () {
      this.subscriberCount = 1;
      this.publishWithMetadataInput = [];
      this.publishWithMetadataRetval = null;
    }

    async getSubscriberCount () {
      return this.subscriberCount;
    }

    async publishWithMetadata (message, metadata) {
      this.publishWithMetadataInput.push({
        message,
        metadata
      });
      return this.publishWithMetadataRetval;
    }
}

export class OrchestratorPluginDal {
    public getPlugins = jest.fn();
    public getPluginsResults: OrchestratorSyncPlugin[];

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

export class OrchestratorStatusDal {
    public getStatusObjectInput = null;
    public getStatusObjectResult = null;
    public getSyncPluginsCalls = 0;
    public getSyncPluginsRetval = [];
    public updateStageStatusInput = null;
    public updatePluginStatusInput = null;

    public reset () {
      this.getStatusObjectInput = null;
      this.getStatusObjectResult = null;
      this.getSyncPluginsCalls = 0;
      this.getSyncPluginsRetval = [];
      this.updateStageStatusInput = null;
      this.updatePluginStatusInput = null;
    }

    public async getStatusObject (uid: string, activity: string) {
      this.getStatusObjectInput = { uid, activity };
      return this.getStatusObjectResult;
    }

    public async getSyncPlugins () {
      this.getSyncPluginsCalls++;
      return this.getSyncPluginsRetval;
    }

    public async updatePluginStatus (uid: string, workflow: string, activity: string, stage: OrchestratorStage,
      mandatory: boolean, pluginName: string, state: OrchestratorComponentState,
      message: string) {
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
    }

    public async updateStageStatus (uid: string, workflow: string, activity: string, stage: OrchestratorStage,
      state: OrchestratorComponentState, message: string) {
      this.updateStageStatusInput = {
        uid,
        workflow,
        activity,
        stage,
        state,
        message
      };
    }
}

export class MakeLambdaCallWrapper {
    static calls = [];
    static retval = {};
    static error = '';
    public calls = MakeLambdaCallWrapper.calls;
    public MakeLambdaCallRetval: any = MakeLambdaCallWrapper.retval;
    public reset () {
      MakeLambdaCallWrapper.calls = [];
      this.calls = MakeLambdaCallWrapper.calls;
      MakeLambdaCallWrapper.error = null;
      MakeLambdaCallWrapper.retval = { StatusCode: 200 };
      this.MakeLambdaCallRetval = MakeLambdaCallWrapper.retval;
    }

    public setError (error) {
      MakeLambdaCallWrapper.error = error;
    }

    public async MakeLambdaCall<T> (event: string, functionName: string, config: any) {
      MakeLambdaCallWrapper.calls.push({ event, functionName });
      if (MakeLambdaCallWrapper.error) {
        throw MakeLambdaCallWrapper.error;
      }

      return MakeLambdaCallWrapper.retval;
    }
}

export class MockPluginManagementDal {
    public addPluginInput: Array<any> = [];
    public removePluginInput: Array<any> = [];

    public reset () {
      this.addPluginInput = [];
      this.removePluginInput = [];
    }

    public async removePlugin (subscriptionArn) {
      this.removePluginInput.push({ subscriptionArn });
    }

    public async addPlugin (subscriptionArn, params: any) {
      this.addPluginInput.push({
        subscriptionArn,
        ...params
      });
    }
}
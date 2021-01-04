import { OrchestratorComponentState, OrchestratorStage } from "../src";

class MockOrchstratorStatusDal {
    public updatePluginStatusInput = [];

    reset() {
        console.log('resetting')
        this.updatePluginStatusInput = [];
        this.updatePluginStatus.mockClear();
        this.getStatusObject.mockReset();
    }

    updatePluginStatus = jest.fn().mockImplementation((
        uid: string, workflow: string, activity: string, stage: OrchestratorStage,
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
    getStatusObject = jest.fn();
}

export const mockOrchstratorStatusDal = new MockOrchstratorStatusDal();
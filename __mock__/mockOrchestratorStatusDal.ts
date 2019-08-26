import { OrchestratorComponentState, OrchestratorStage } from "../src";

export class MockOrchstratorStatusDal {
    public updatePluginStatusInput = [];
    reset() {
        this.updatePluginStatusInput = [];
        this.updatePluginStatus.mockClear();
        this.getStatusObject.mockClear();
        this.putInitialWorkflowStatus.mockClear();
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
    putInitialWorkflowStatus = jest.fn();
}

export const mockOrchstratorStatusDal = new MockOrchstratorStatusDal();

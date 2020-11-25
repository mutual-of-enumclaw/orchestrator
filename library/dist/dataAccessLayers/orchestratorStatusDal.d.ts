import { OrchestratorComponentState, OrchestratorStage, OrchestratorWorkflowStatus } from '..';
export declare class OrchestratorStatusDal {
    private statusTable;
    private dal;
    constructor(statusTable: string);
    getStatusObject(uid: string, workflow: string, consistentRead?: boolean): Promise<OrchestratorWorkflowStatus>;
    updatePluginStatus(uid: string, workflow: string, activity: string, stage: OrchestratorStage, mandatory: boolean, pluginName: string, state: OrchestratorComponentState, message: string): Promise<void>;
    updateStageStatus(uid: string, workflow: string, activity: string, stage: OrchestratorStage, state: OrchestratorComponentState, message: string, updateTime?: Date, token?: string): Promise<void>;
}

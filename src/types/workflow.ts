/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
import { OrchestratorActivityStatus, OrchestratorStage } from '.';

export interface OrchestratorWorkflowStatus {
    uid: string;
    workflow: string;
    currentDate: number;
    metadata: any;
    status: OrchestratorStatus;
    activities: {
        [key: string]: OrchestratorActivityStatus;
    },
    stages?: {
        [key: string]: any
    },
    metadataOverride?: boolean;
}

export class OrchestratorError extends Error {
    public setStatus: boolean = true;
}

export interface OrchestratorPluginMessage extends OrchestratorWorkflowStatus {
    stages: {
        [key:string]: string;
    };
    activity: string;
    stage?: OrchestratorStage;
    initialize?: boolean;
}

export interface OrchestratorStatus {
    state: OrchestratorComponentState,
    message?: string
}

export enum OrchestratorComponentState {
    NotStarted = 'Not Started',
    InProgress = 'In Progress',
    MandatoryCompleted = 'Mandatory Completed',
    Complete = 'Complete',
    Error = 'Error',
    OptionalError = 'Optional Task Error'
}


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorComponentState = exports.OrchestratorError = void 0;
class OrchestratorError extends Error {
    constructor() {
        super(...arguments);
        this.setStatus = true;
    }
}
exports.OrchestratorError = OrchestratorError;
var OrchestratorComponentState;
(function (OrchestratorComponentState) {
    OrchestratorComponentState["NotStarted"] = "Not Started";
    OrchestratorComponentState["InProgress"] = "In Progress";
    OrchestratorComponentState["MandatoryCompleted"] = "Mandatory Completed";
    OrchestratorComponentState["Complete"] = "Complete";
    OrchestratorComponentState["Error"] = "Error";
    OrchestratorComponentState["OptionalError"] = "Optional Task Error";
    OrchestratorComponentState["DoNotRun"] = "Do Not Run";
})(OrchestratorComponentState = exports.OrchestratorComponentState || (exports.OrchestratorComponentState = {}));
//# sourceMappingURL=workflow.js.map
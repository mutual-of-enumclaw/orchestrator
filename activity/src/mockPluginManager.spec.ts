import { PluginManagementDal, PluginManager } from "@moe-tech/orchestrator";

export class MockPluginManager {
    updateLambdaParams = jest.fn();
    getPlugin = jest.fn();
    removePluginEvent = jest.fn();

    constructor(pmClass, pmDalClass) {
        pmClass.prototype.updateLambdaParams = this.updateLambdaParams;
        pmClass.prototype.removePluginEvent = this.removePluginEvent;
        pmDalClass.prototype.getPlugin = this.getPlugin;
    }

    reset() {
        this.updateLambdaParams.mockReset();
        this.getPlugin.mockReset();
        this.removePluginEvent.mockReset();
    }
}

describe('placeholder', () => {
    test('placeholder', () => {
    });
});

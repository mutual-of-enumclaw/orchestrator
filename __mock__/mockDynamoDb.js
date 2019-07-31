"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MockDynamoDb {
    constructor() {
        this.scanReturn = null;
    }
    reset() {
        this.error = '';
        this.updateReturn = null;
        this.updateInput = null;
        this.scanReturn = null;
        this.queryReturn = null;
        this.returnObject = null;
        this.deleteInput = null;
        this.putInput = null;
    }
    get(params) {
        return {
            promise: () => {
                return new Promise((resolve, reject) => {
                    resolve({
                        '$response': {
                            error: this.error,
                        },
                        Item: this.returnObject
                    });
                });
            }
        };
    }
    put(params) {
        this.putInput = params;
        return {
            promise: () => {
                return new Promise((resolve, reject) => {
                    resolve({
                        '$response': {
                            error: this.error,
                            data: this.returnObject
                        }
                    });
                });
            }
        };
    }
    query(params) {
        return {
            promise: () => {
                return new Promise((resolve, reject) => {
                    resolve({
                        '$response': {
                            error: this.error,
                        },
                        Items: this.queryReturn
                    });
                });
            }
        };
    }
    scan(scanParams) {
        return {
            promise: () => {
                return new Promise((resolve, reject) => {
                    resolve(Object.assign({ '$response': {
                            error: this.error,
                        } }, this.scanReturn));
                });
            }
        };
    }
    update(updateParams) {
        this.updateInput = updateParams;
        return {
            promise: () => {
                return new Promise((resolve, reject) => {
                    resolve(Object.assign({ '$response': {
                            error: this.error,
                        } }, this.updateReturn));
                });
            }
        };
    }
    delete(deleteParams) {
        this.deleteInput = deleteParams;
        return {
            promise: () => {
                return new Promise((resolve) => {
                    resolve();
                });
            }
        };
    }
}
exports.MockDynamoDb = MockDynamoDb;
//# sourceMappingURL=mockDynamoDb.js.map
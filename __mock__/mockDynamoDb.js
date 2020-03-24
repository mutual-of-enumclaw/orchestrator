"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var MockDynamoDb = /** @class */ (function () {
    function MockDynamoDb() {
        this.scanReturn = null;
    }
    MockDynamoDb.prototype.reset = function () {
        this.error = '';
        this.updateReturn = null;
        this.updateInput = null;
        this.scanReturn = null;
        this.queryReturn = null;
        this.returnObject = null;
        this.deleteInput = null;
        this.putInput = null;
        this.updateInputs = [];
    };
    MockDynamoDb.prototype.get = function (params) {
        var _this = this;
        return {
            promise: function () {
                return new Promise(function (resolve, reject) {
                    resolve({
                        '$response': {
                            error: _this.error
                        },
                        Item: _this.returnObject
                    });
                });
            }
        };
    };
    MockDynamoDb.prototype.put = function (params) {
        var _this = this;
        this.putInput = params;
        return {
            promise: function () {
                return new Promise(function (resolve, reject) {
                    resolve({
                        '$response': {
                            error: _this.error,
                            data: _this.returnObject
                        }
                    });
                });
            }
        };
    };
    MockDynamoDb.prototype.query = function (params) {
        var _this = this;
        return {
            promise: function () {
                return new Promise(function (resolve, reject) {
                    resolve({
                        '$response': {
                            error: _this.error
                        },
                        Items: _this.queryReturn
                    });
                });
            }
        };
    };
    MockDynamoDb.prototype.scan = function (scanParams) {
        var _this = this;
        return {
            promise: function () {
                return new Promise(function (resolve, reject) {
                    resolve(__assign({ '$response': {
                            error: _this.error
                        } }, _this.scanReturn));
                });
            }
        };
    };
    MockDynamoDb.prototype.update = function (updateParams) {
        var _this = this;
        this.updateInputs.push(updateParams);
        this.updateInput = updateParams;
        return {
            promise: function () {
                return new Promise(function (resolve, reject) {
                    resolve(__assign({ '$response': {
                            error: _this.error
                        } }, _this.updateReturn));
                });
            }
        };
    };
    MockDynamoDb.prototype["delete"] = function (deleteParams) {
        this.deleteInput = deleteParams;
        return {
            promise: function () {
                return new Promise(function (resolve) {
                    resolve();
                });
            }
        };
    };
    return MockDynamoDb;
}());
exports.MockDynamoDb = MockDynamoDb;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorStatusDal = void 0;
/*!
 * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
 * License: Public
 */
const AWS = __importStar(require("aws-sdk"));
class OrchestratorStatusDal {
    constructor(statusTable) {
        this.statusTable = statusTable;
        this.dal = new AWS.DynamoDB.DocumentClient();
    }
    getStatusObject(uid, workflow, consistentRead) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!uid) {
                throw new Error('No id specified');
            }
            if (!workflow) {
                throw new Error('No activity specified');
            }
            const result = yield this.dal.get({
                TableName: this.statusTable,
                Key: { uid, workflow },
                ConsistentRead: consistentRead
            }).promise();
            return result.Item;
        });
    }
    updatePluginStatus(uid, workflow, activity, stage, mandatory, pluginName, state, message) {
        return __awaiter(this, void 0, void 0, function* () {
            const type = mandatory ? 'mandatory' : 'optional';
            const status = {
                state,
                message: message === null || message === void 0 ? void 0 : message.substr(0, 180)
            };
            if (!message) {
                delete status.message;
            }
            console.log("uid: ", JSON.stringify(uid));
            console.log("workflow: ", JSON.stringify(workflow));
            console.log("activity: ", JSON.stringify(activity));
            console.log("stage: ", JSON.stringify(stage));
            console.log("mandatory: ", JSON.stringify(mandatory));
            console.log("pluginName: ", JSON.stringify(pluginName));
            console.log("state: ", JSON.stringify(state));
            console.log("message: ", JSON.stringify(message));
            const params = {
                TableName: this.statusTable,
                Key: { uid, workflow },
                UpdateExpression: 'set #activities.#activity.#stage.#type.#pluginName = :status',
                ExpressionAttributeNames: {
                    '#activities': 'activities',
                    '#activity': activity,
                    '#stage': stage,
                    '#type': type,
                    '#pluginName': pluginName
                },
                ExpressionAttributeValues: {
                    ':status': status
                },
            };
            yield this.dal.update(params).promise();
        });
    }
    updateStageStatus(uid, workflow, activity, stage, state, message, updateTime = new Date(), token = '') {
        return __awaiter(this, void 0, void 0, function* () {
            const params = {
                TableName: this.statusTable,
                Key: { uid, workflow },
                UpdateExpression: 'set #activities.#activity.#stage.#status.#state = :state' +
                    ', #activities.#activity.#stage.#status.#message = :message' +
                    ', #activities.#activity.#stage.#status.#startTime = :startTime',
                ExpressionAttributeNames: {
                    '#activities': 'activities',
                    '#activity': activity,
                    '#stage': stage,
                    '#status': 'status',
                    '#state': 'state',
                    '#message': 'message',
                    '#startTime': 'startTime'
                },
                ExpressionAttributeValues: {
                    ':state': state,
                    ':message': message,
                    ':startTime': updateTime.toString()
                },
            };
            if (token) {
                params.UpdateExpression += ', #activities.#activity.#stage.#status.#token = :token';
                params.ExpressionAttributeNames['#token'] = 'token';
                params.ExpressionAttributeValues[':token'] = token;
            }
            yield this.dal.update(params).promise();
            //
            // Perform consistent read after write to make sure we dont
            // collide with later update
            //
            yield this.dal.get({
                TableName: this.statusTable,
                Key: { uid, workflow },
                ConsistentRead: true
            }).promise();
        });
    }
}
exports.OrchestratorStatusDal = OrchestratorStatusDal;
//# sourceMappingURL=orchestratorStatusDal.js.map
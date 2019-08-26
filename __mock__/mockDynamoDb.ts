export class MockDynamoDb {
    public returnObject: any;
    public queryReturn: Array<any>;
    public error: string;
    public scanReturn: any = undefined;
    public updateReturn: any;
    public updateInput: any;
    public deleteInput: any;
    public putInput: any;

    public reset() {
        this.error = '';
        this.updateReturn = undefined;
        this.updateInput = undefined;
        this.scanReturn = undefined;
        this.queryReturn = undefined;
        this.returnObject = undefined;
        this.deleteInput = undefined;
        this.putInput = undefined;
    }

    get = jest.fn().mockImplementation(params => {
        const ret = new DynamoReturn();
        ret['$response'] = {
            error: this.error,
        };
        ret['Item'] = this.returnObject;
        return ret;
    });

    put = jest.fn().mockImplementation(params => {
        this.putInput = params;
        const ret = new DynamoReturn();
        ret['$response'] = {
            error: this.error,
            data: this.returnObject
        };
        return ret;
    });

    query = jest.fn().mockImplementation(params => {
        const ret = new DynamoReturn();
        ret['$response'] = {
            error: this.error,
        };
        ret['Items'] = this.queryReturn;
        return ret;
    });


    public scan = jest.fn().mockImplementation(scanParams => {
        const ret = new DynamoReturn();
        ret['$response'] = {
            error: this.error,
        };
        Object.assign(ret, this.scanReturn);
        return ret;
    });

    public update = jest.fn().mockImplementation(updateParams => {
        this.updateInput = updateParams;
        const ret = new DynamoReturn();
        ret['$response'] = {
            error: this.error,
        };
        Object.assign(ret, this.updateReturn)
        return ret;
        
    });

    public delete = jest.fn().mockImplementation(deleteParams => {
        this.deleteInput = deleteParams;
        return new DynamoReturn();
    });
}

class DynamoReturn {
    promise() {
        const keys = Object.keys(this);
        if (keys.length === 0) {
            return;
        }
        const retObj = {};
        for (const prop of Object.keys(this)) {
            retObj[prop] = this[prop];
        }
        return retObj;
    }
}

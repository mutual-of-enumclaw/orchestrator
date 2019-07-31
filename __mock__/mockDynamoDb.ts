export class MockDynamoDb {
    public returnObject: any;
    public queryReturn: Array<any>;
    public error: string;
    public scanReturn: any = null;
    public updateReturn: any;
    public updateInput: any;
    public deleteInput: any;
    public putInput: any;

    public reset() {
        this.error = '';
        this.updateReturn = null;
        this.updateInput = null;
        this.scanReturn = null;
        this.queryReturn = null;
        this.returnObject = null;
        this.deleteInput = null;
        this.putInput = null;
    }

    public get(params) : any {
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

    public put(params) : any {
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

    public query(params) : any {
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

    
    public scan(scanParams: any): any {
        return {
            promise: () => {
                return new Promise((resolve, reject) => {
                    resolve({
                        '$response': {
                            error: this.error,
                        },
                        ...this.scanReturn
                    });
                });
            }
        };
    }

    public update(updateParams: any): any {
        this.updateInput = updateParams;
        return {
            promise: () => {
                return new Promise((resolve, reject) => {
                    resolve({
                        '$response': {
                            error: this.error,
                        },
                        ...this.updateReturn
                    });
                });
            }
        };
    }

    public delete(deleteParams: any): any {
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

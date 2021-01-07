import { S3 } from 'aws-sdk';

export class WorkflowRegister {
    private s3: S3 = new S3();

    constructor (private bucketName: string) {
        if (!bucketName) {
            throw new Error('No bucket specified');
        }
    }

    public async list () : Promise<Array<string>> {
        const result = await this.s3.listObjectsV2({
            Bucket: this.bucketName
        }).promise();

        if (result === null || !result.Contents) {
            throw new Error('Result from s3 was invalid');
        }

        const retval = [];
        for (const i in result.Contents) {
            const item = result.Contents[i];
            if (item.Key) {
                retval.push(item.Key);
            }
        }
        return retval;
    }

    public async register (workflow: string): Promise<any> {
        if (!workflow) {
            throw new Error('Parameter workflow not specified');
        }

        const key = workflow.replace(/ /g, '-');
        await this.s3.putObject({
            Bucket: this.bucketName,
            Key: key,
            Body: ''
        }).promise();
    }
}

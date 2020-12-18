import { send } from 'cfn-response-promise';
import { SSM } from 'aws-sdk';

const ssm = new SSM();

export async function handler(event, context) {
    console.log(JSON.stringify(event));
    const data = {
        EpsagonToken: '',
        EpsagonAppName: ''
    };

    try {
        const params = await ssm.getParameters({
            Names: [
                process.env.epsagonTokenPath, 
                process.env.epsagonAppNamePath
            ]
        }).promise();

        const epsagonAppName = params.Parameters.find(x => x.Name === process.env.epsagonAppNamePath);
        const epsagonToken = params.Parameters.find(x => x.Name === process.env.epsagonAppNamePath);

        data.EpsagonAppName = epsagonAppName?.Value || '';
        data.EpsagonToken = epsagonToken?.Value || '';
    } catch (err) {
        console.log(err);
    }

    return await send(event, context, 'SUCCESS', { "traceConfig": JSON.stringify(data)} );
}
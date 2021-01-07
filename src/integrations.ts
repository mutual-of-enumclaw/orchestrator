import { send } from 'cfn-response-promise';
import { SSM } from 'aws-sdk';
import { OrchestratorConfig } from '@moe-tech/orchestrator';

const ssm = new SSM();

export async function handler (event, context) {
    console.log(JSON.stringify(event));
    const data: OrchestratorConfig = {
        statusTable: process.env.statusTable
    };

    try {
        const params = await ssm.getParameters({
            Names: [
                process.env.epsagonTokenPath,
                process.env.epsagonAppNamePath
            ]
        }).promise();

        const epsagonAppName = params.Parameters.find(x => x.Name === process.env.epsagonAppNamePath);
        const epsagonToken = params.Parameters.find(x => x.Name === process.env.epsagonTokenPath);
        const metadataOnly = params.Parameters.find(x => x.Name === process.env.epsagonMetadataPath);
        if (epsagonToken && epsagonAppName) {
            data.epsagon = {
                appName: epsagonAppName.Value,
                token: epsagonToken.Value,
                metadataOnly: metadataOnly?.Value === 'true'
            };
        }
    } catch (err) {
        console.log(err);
    }

    await ssm.putParameter({
        Name: `/${process.env.environment}/orchestrator/stacks/${process.env.stack.replace(/-/g, '')}/config`,
        Value: JSON.stringify(data),
        Type: 'String',
        Overwrite: true
    }).promise();
    return await send(event, context, 'SUCCESS', { StatusArn: process.env.StatusTableArn, Config: JSON.stringify(data) });
}

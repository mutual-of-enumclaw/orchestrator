import { send } from 'cfn-response';

export async function resourceHandler(event, context) {
    send(event, context, 'SUCCESS', { Arn: process.env.layerArn });
}
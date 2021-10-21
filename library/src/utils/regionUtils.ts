import { SSM } from "aws-sdk";
import { GetParameterRequest,GetParameterResult } from "aws-sdk/clients/ssm"; // TS Types

let envStage: string = process.env.StageName; // EX. "snd"
let currentRegion: string = process.env.AWS_REGION;
let ssm = new SSM();

export function setEnvStage(object: any) { envStage = object; }
export function setCurrentRegion(object: any) { currentRegion = object; }
export function setSsm(object: any) { ssm = object; }
export interface AppRegions {
    primaryRegion: string
    activeRegions: string
}

/**
 * Util function that returns true if the current region is the primaryRegion and in activeRegions.
 * This is determined using the SSM Parameter: /${envStage}/nucleus/disasterRecovery/appRegions
 */
export async function runInRegion(): Promise<Boolean> {
    try {
        if (!envStage || typeof envStage !== 'string') {
            const errorMessage = `runInRegion must have a valid envStage. Not this: ${envStage}`;
            throw new Error(errorMessage);  
        }
        if (!currentRegion || typeof currentRegion !== 'string') {
            const errorMessage = `runInRegion must have a valid currentRegion. Not this: ${currentRegion}`;
            throw new Error(errorMessage);
        }
    
        const ssmRequest: GetParameterRequest = {
            Name: `/${envStage}/nucleus/disasterRecovery/appRegions`,
            WithDecryption: false,
        };
        const ssmResult: GetParameterResult = await ssm.getParameter(ssmRequest).promise();
        if (!ssmResult) {
            const errorMessage = `runInRegion must have a valid Parameter Store result. Not this: ${ssmResult}`;
            throw new Error(errorMessage);
        }
    
        console.log(`runInRegion details - envStage: ${envStage}, currentRegion: ${currentRegion}`);
        console.log(ssmResult);
        
        const parameterValue: string = ssmResult?.Parameter?.Value;
        if (!parameterValue) {
            const errorMessage = `runInRegion must retrieve a valid Parameter Store value. Not this: ${ssmResult}`;
            throw new Error(errorMessage);
        }

        const parameterObj: AppRegions = JSON.parse(parameterValue);
        if (!parameterObj.primaryRegion || !parameterObj.activeRegions) {
            const errorMessage = `runInRegion must have correct properties in Parameter Store value. Not this: ${parameterObj}`;
            throw new Error(errorMessage);
        }

        // Continue if the region is the primaryRegion and in activeRegions
        const isPrimaryRegion = parameterObj.primaryRegion === currentRegion;
        const isRegionActive = parameterObj.activeRegions.indexOf(currentRegion) !== -1;
        if (isPrimaryRegion && isRegionActive) {
            return true;
        }

        return false;
    } catch(error) {
        throw error;
    }
}
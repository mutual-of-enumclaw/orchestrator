// Need to set process vars before file import
process.env.StageName = "us-west-2"
process.env.AWS_REGION = "us-west-2"

import * as funcs from './regionUtils';
import { GetParameterResult } from "aws-sdk/clients/ssm"; // TS Types

export interface AppRegions {
    primaryRegion: string
    activeRegions: string
}

interface SsmMockSetup {
    envStage: string
    primaryRegion: string
    activeRegions: string[]
}

const paramNameMocker = (envStage: string) => {
    return `/${envStage}/nucleus/disasterRecovery/appRegions`;
}

const paramValueMocker = (primaryRegion: string, activeRegions: string[]) => {
    const paramValue: AppRegions = {
        primaryRegion,
        activeRegions: activeRegions.toString()
    }
    return JSON.stringify(paramValue)
}

const testParamMocker = (envStage: string, primaryRegion: string, activeRegions: string[]) => {
    return {
        Parameter: {
            Name: paramNameMocker(envStage),
            Type: "String",
            Value: paramValueMocker(primaryRegion, activeRegions),
            Version: 1,
            LastModifiedDate: new Date('2021-01-01T12:00:00.000Z'),
            ARN: `arn:aws:ssm:my-region-1:111222333444:parameter/example`,
            DataType: "text",
        }
    } as GetParameterResult
}

const ssmMocker = (ssmMockSetup: SsmMockSetup) => {
    return {
      getParameter: (_params) => ({
        promise: () => new Promise((res, _rej) => {
          res(testParamMocker(ssmMockSetup.envStage, ssmMockSetup.primaryRegion, ssmMockSetup.activeRegions))
        })
      }),
    }
  }

const testSetup = ({
    envStage,
    currentRegion,
    primaryRegion,
    activeRegions,
}) => {
    funcs.setEnvStage(envStage);
    funcs.setCurrentRegion(currentRegion);
    funcs.setSsm(ssmMocker({
        envStage: envStage,
        primaryRegion,
        activeRegions,
    }));
}

describe('runInRegion', () => {
    let mock: any

    beforeEach(() => {
        mock = jest.fn()
    
        // Empty defaults
        funcs.setEnvStage(null)
        funcs.setCurrentRegion(null)
        funcs.setSsm(null)
    })

    test('should return true if the currentRegion is in primaryRegion and activeRegions of the AppRegions parameter', async () => {
        testSetup({
            envStage: "snd",
            currentRegion: "us-west-2",
            primaryRegion: "us-west-2",
            activeRegions: ["us-west-2", "us-east-1"],
        })

        const result = await funcs.runInRegion();
        expect(result).toBe(true);
    })

    test('should return false if the currentRegion is not in primaryRegion of the AppRegions parameter', async () => {
        testSetup({
            envStage: "snd",
            currentRegion: "us-west-2",
            primaryRegion: "us-east-1",
            activeRegions: ["us-west-2", "us-east-1"],
        })

        const result = await funcs.runInRegion();
        expect(result).toBe(false);
    })

    test('should return false if the currentRegion is not in activeRegions of the AppRegions parameter', async () => {
        testSetup({
            envStage: "snd",
            currentRegion: "us-west-2",
            primaryRegion: "us-west-2",
            activeRegions: ["us-east-1"],
        })

        const result = await funcs.runInRegion();
        expect(result).toBe(false);
    })

    test('should throw an error if the envStage is invalid', async () => {
        testSetup({
            envStage: null,
            currentRegion: "us-west-2",
            primaryRegion: "us-west-2",
            activeRegions: ["us-west-2", "us-east-1"],
        })

        expect(async () => await funcs.runInRegion()).rejects.toThrowError();
    })

    test('should throw an error if the currentRegion is invalid', async () => {
        testSetup({
            envStage: "snd",
            currentRegion: null,
            primaryRegion: "us-west-2",
            activeRegions: ["us-west-2", "us-east-1"],
        })

        expect(async () => await funcs.runInRegion()).rejects.toThrowError();
    })
});
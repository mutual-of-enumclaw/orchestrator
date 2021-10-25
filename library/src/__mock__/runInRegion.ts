import * as funcs from '../utils/regionUtils';

interface SsmMockSetup {
    envStage: string
    primaryRegion: string
    activeRegions: string[]
}

const paramNameMocker = (envStage: string) => {
    return `/${envStage}/disasterRecovery/appRegions`;
};

const paramValueMocker = (primaryRegion: string, activeRegions: string[]) => {
    const paramValue = {
        primaryRegion,
        activeRegions: activeRegions.toString()
    };
    return JSON.stringify(paramValue);
};

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
    };
};

const ssmMocker = (ssmMockSetup: SsmMockSetup) => {
    return {
        getParameter: (_params) => ({
            promise: () => new Promise((res, _rej) => {
                res(testParamMocker(ssmMockSetup.envStage, ssmMockSetup.primaryRegion, ssmMockSetup.activeRegions));
            })
        }),
    };
};
export const testRunInRegionSetup = ({
    envStage,
    currentRegion,
    primaryRegion,
    activeRegions,
}) => {
    funcs.setEnvStage(envStage);
    funcs.setCurrentRegion(currentRegion);
    funcs.setSsm(ssmMocker({
        envStage,
        primaryRegion,
        activeRegions,
    }));
};

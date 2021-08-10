export function skipForRegion(rawImage: any, awsRegion: any, awsDeployedRegions: any, logger: any, logType: any, errorObj: any,): Boolean {
    const currentRegion = awsRegion;
    const deployedRegions = awsDeployedRegions?.split(',');
    let recordRegion = rawImage['awsRegion'];

    if (!deployedRegions || deployedRegions.length !== 2) {
        return false;
    }

    if (!deployedRegions.includes(currentRegion)) {
        throw new Error(`Region ${currentRegion} not in deployed regions list: ${deployedRegions}`);
    }

    if (!deployedRegions.includes(recordRegion)) {
        const err = `awsRegion ${recordRegion} is invalid. Defaulting to the deployed primary region: ${deployedRegions[0]}`;

        if (logger) {
            logger({ err, currentRegion, deployedRegions, recordRegion, rawImage });
        } else {
            console.log({ err, currentRegion, deployedRegions, recordRegion, rawImage });
        }

        if (errorObj) {
            errorObj(new Error(err))
        } else {
            console.error(new Error(err))
        }

        recordRegion = deployedRegions[0];
    }

    if (recordRegion !== currentRegion) {
        if (logger && logType) {
            logger(`Skipping replication event. awsRegion: ${recordRegion}`, logType.INFO);
        } else {
            console.log(`Skipping replication event. awsRegion: ${recordRegion}`);
        }

        return true;
    }

    return false;
}
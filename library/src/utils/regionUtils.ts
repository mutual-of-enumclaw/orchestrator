/**
 * Ensure you trim, string, and split the deployed regions prior to passing in: process.env.DeployedRegions?.trim().toString().split(',');
 */
export function skipForRegion(rawImage: any, awsRegion: string, deployedRegions: string[], logger: any, logType: any, errorObj: any): Boolean {
    if (logger) {
        logger({ rawImage, awsRegion, deployedRegions });
    } else {
        console.log({ rawImage, awsRegion, deployedRegions });
    }

    // likely a DELETE record, exit function
    if (Object.keys(rawImage).length === 0) {
        return false;
    }

    const currentRegion = awsRegion;
    let recordRegion = rawImage['awsRegion'];

    if (!deployedRegions || deployedRegions.length !== 2) {
        return false;
    }

    if (deployedRegions.indexOf(currentRegion) === -1) {
        throw new Error(`Region ${currentRegion} not in deployed regions list: ${deployedRegions}`);
    }

    if (deployedRegions.indexOf(recordRegion) === -1) {
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
import { skipForRegion } from './regionUtils';

describe('skipForRegion', () => {
    test('should return false if there are not two deployed regions', () => {
        const data = { awsRegion: 'us-east-2' };

        let result = skipForRegion(data, "", ["us-west-2"], null, null, null)
        expect(result).toBe(false)

        result = skipForRegion(data, "", [""], null, null, null)
        expect(result).toBe(false)

        result = skipForRegion(data, "", ["us-west-2","us-east-2","us-east-1"], null, null, null)
        expect(result).toBe(false)
    })

    test('should return true if regions don\'t match', () => {
        const data = { awsRegion: 'us-east-2' };
        const result = skipForRegion(data, "us-west-2", ["us-west-2","us-east-2"], null, null, null)
        expect(result).toBe(true);
    });

    test('should return false if regions match', () => {
        const data = { awsRegion: 'us-west-2' };
        const result = skipForRegion(data, "us-west-2", ["us-west-2","us-east-2"], null, null, null)
        expect(result).toBe(false);
    });

    test('should default awsRegion to deployed primary if its not valid', () => {
        const data = { awsRegion: undefined };
        const result = skipForRegion(data, "us-west-2", ["us-west-2","us-east-2"], null, null, null)
        expect(result).toBe(false);
    });

    test('should throw if current region is not in DeployedRegions', () => {
        const data = { awsRegion: 'us-west-2' };
        const t = () => skipForRegion(data, "us-west-2", ["us-east-2","us-east-1"], null, null, null)
        expect(t).toThrow(Error);
    });

    test('should return work with one region', () => {
        const data = { awsRegion: 'us-west-2' };
        const result = skipForRegion(data, "us-west-2", ["us-west-2"], null, null, null)
        expect(result).toBe(false);
    });
});
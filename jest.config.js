module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    //collectCoverage: true,
    collectCoverageFrom: [
        "src/**/*.ts",
        "!**/node_modules/**"
    ],
    reporters: ["default", "jest-junit"],
    coverageReporters: ['cobertura', 'text', 'text-summary'],
    verbose: true,
    roots: [
        'src/',
        'library/src',
        'metrics/src',
        'activity/src'
    ]
};
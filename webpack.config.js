const path = require('path');
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
// var HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const AwsSamPlugin = require("aws-sam-webpack-plugin");

const awsSamPlugin = new AwsSamPlugin();

module.exports = {
    mode: process.env.NODE_ENV || "production",
    entry: () => awsSamPlugin.entry(),
    devtool: 'source-map',
    externals: ['aws-sdk', 'epsagon'],
    resolve: {
        extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    },
    output: {
        libraryTarget: 'commonjs',
        path: path.resolve('.'),
        filename: (chunkData) => awsSamPlugin.filename(chunkData),
    },
    target: 'node',
    plugins: [
        awsSamPlugin
    ],
    module: {
        rules: [
            {
                test: /\.ts(x?)$/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ],
            }
        ]
    }
};

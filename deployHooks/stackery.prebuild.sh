#!/bin/bash
npm ci

rm -Rf .aws-sam

cd orch-utils
npm ci
cd ..

export STACKERY_DEPLOY_INFO="$1"

npm run activities -- --stackery-json

cd activity
sam build
cd ../metrics
sam build
cd ..
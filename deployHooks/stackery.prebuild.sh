#!/bin/bash
npm ci

cd orch-utils
npm ci
cd ..

npm run activities -- --stackery-json

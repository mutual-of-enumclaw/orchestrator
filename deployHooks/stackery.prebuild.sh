#!/bin/bash
npm ci
npm run installTypescript
npm run installUtils
npm run activities -- --stackery-json
# Simple Workflow

This example walks through the deployment of a simple workflow, and the steps to set it up.

## 1. Setup Orchestrator Core
The first step is to setup the orchestrator core components.  The core components only have to be deployed once, and can be shared between a variety of workflows.

To install the orchestrator core components navigate to the root of the orchestrator director and run

``` !bash
cd ../..
npm install
serverless deploy --stage dev
```

## 2. Setup Orchestrator Activities
This step will walk you through the setup or orchestrator activities, which your workflow will work with to create a flexable plugin framework.

To install orchestrator activities navigate to the activity submodule and deploy an activity for "step1".

``` !bash
cd ../../activity
npm install
serverless deploy --stage dev --activity Step1
serverless deploy --stage dev --activity Step2
```

## 3. Deploy workflow
This step will deploy out the single step workflow leveraging the serverless framework

To deploy the workflow, navigate to the workflow directory and deploy.
``` !bash
cd ./workflow
npm i
serverless deploy --stage dev
```

## 4. Deploy general plugin
This step will deploy the most common type of plugin to the orchestrator activity for Step1.

To deploy the plugin, navigate to the plugin-typical directory and deploy
``` !bash
cd ./plugin-typical
npm i
serverless deploy --stage dev
```

## 5. Deploy pre/post activity plugin
This step will deploy a pre and post activity plugin to the orchestrator activity for Step1.

To deploy the plugin, navigate to the plugin-pre-post directory and deploy
``` !bash
cd ./plugin-pre-post
npm i
serverless deploy --stage dev
```

## 6. Run the workflow
1. Log into your aws account and navigate to "Step Functions".  
2. Once there find the "simple-step-workflows-dev-workflow" and click on it.
3. Click the "Start execution" button
4. Past the following into the Input
``` JSON
{
    "uid": "123-456"
}
```
5. Click "Start execution"
6. Through the AWS Console, navigate to "DynamoDB"
7. Under the tables, find "orchestrator-dev-status"
8. Click the "Items" tab and select the row shown.

This object which you will have on the screen will show the activities the workflow executed, along with the states of each of the activities. 
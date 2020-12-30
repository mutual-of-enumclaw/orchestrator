# Simple Workflow

This example walks through the deployment of a simple workflow, and the steps to set it up.

## 1. Create the parameters
Use the following command to create the activities parameter in parameter store

aws ssm put-parameter --name /snd/orchestrator/stacks/simpleworkflow/activities --value "['Step1', 'Step2', 'Step3']"

## 2. Deploy the Orchestrator Stack
Deploy the Orchestrator Framework

Run the following from the root of this repository

#### AWS SAM
```!bash
npm run build

npm run activities -- --ssm-key /snd/orchestrator/stacks/simpleorch/activities

npm run deploy -- --stack-name simple-orch-snd --s3-bucket <Existing Deployment Bucket> --s3-prefix sam/snd/simple-orch --parameter-overrides StackTagName=simple-orch EnvironmentTagName=snd
```

#### Stackery
```!bash
stackery deploy --stack-name simple-orch --env-name snd --strategy local
```

## 3. Deploy workflow
This step will deploy out a three step workflow leveraging the SAM framework

To deploy the workflow, navigate to the workflow directory and deploy.
``` !bash
cd ./workflow

npm i

sam build

sam deploy --stack-name simple-workflow-snd --s3-bucket <Existing Deployment Bucket> --s3-prefix sam/snd/simple-workflow --parameter-overrides orchstratorStack=simple-orch-snd
```

## 4. Deploy general plugin
This step will deploy the most common type of plugin to the orchestrator activity for Step1.

To deploy the plugin, navigate to the plugin-typical directory and deploy
``` !bash
cd ./plugin-typical

npm i

sam build

sam deploy --stack-name simple-plugin-typical-snd --s3-bucket <Existing Deployment Bucket> --s3-prefix sam/snd/simple-plugin-typical --parameter-overrides orchstratorStack=simple-orch-snd OrchestratorConfig=/snd/orchestrator/stacks/simpleorch/config OrchestratorLayerArn=<The layer arn in the simple-orch output>
```

## 5. Deploy pre/post activity plugin
This step will deploy a pre and post activity plugin to the orchestrator activity for Step1.

To deploy the plugin, navigate to the plugin-pre-post directory and deploy
``` !bash
cd ./plugin-pre-post

npm i

sam build

sam deploy --stack-name simple-plugin-pre-post-snd --s3-bucket <Existing Deployment Bucket> --s3-prefix sam/snd/simple-plugin-typical --parameter-overrides orchstratorStack=simple-orch-snd OrchestratorConfig=/snd/orchestrator/stacks/simpleorch/config OrchestratorLayerArn=<The layer arn in the simple-orch output>
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
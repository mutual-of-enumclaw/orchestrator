# Orchestrator

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

package | version
--- | ---
@moe-tech/orchestrator | 1.0.61

## Walkthrough
Check out this [walkthrough](https://github.com/mutual-of-enumclaw/orchestrator/tree/master/examples/simple-step-workflow) on setting up a simple orchestrator workflow with plugins.

## Installation

#### Library Components

```
npm install --save @moe-tech/orchestrator
```

#### Serverless Components

##### Dependencies
Serverless Framework
``` !bash
npm install -g serverless
```

##### Orchestrator Core Components
The following will deploy the shared components for the orchestrator system

``` !bash
serverless deploy --stage {stage}
```
###### Parameters:
- **stage**: the environmentment name that you will be deploying to (example: dev)
- **system-name**: allows the stack and core components to be named a unique name

##### Orchestrator Metrics
This component automatically creates cloudwatch metrics for the number of actively running workflows

``` !bash
cd metrics
serverless deploy --stage dev
```
- **stage**: the environmentment name that you will be deploying to (example: dev)
- **system-name**: allows the stack and core components to be named a unique name
- **core-stack**: optional: specifies the orchestrator deployment name if it has been changed



### Overview of Orchestrator Terminology
![Overview Image](./images/overview.png)

The Orchestrator system has six major conceptual components which form the capabilities which the orchestrator presents.

#### Metadata
Metadata provides the orchestrator information on information to be acted on.  Metadata is defined by the following [OrchestratorWorkflowStatus](./src/types/workflow.ts) data structure. Additional information can be added to this structure as long as it doesn't violate the existing OrchestratorWorkflowStatus type.

#### Workflow
Workflows tie together a series of activities.  Rather than owning an activity the Orchestrator workflow is responsible for orginizing the order in which activities are invoked for a specific peice of work.  Activities can be shared between multiple workflows.

![Workflow Image](./images/workflows.png)

#### Activity
An activity is defined as a three step process which connects three orchestrators together.

- Pre-Activity: A syncronous orchestrator to run setup plugins before processing starts
- Parallel Activity: An orchestrator which runs plugins in parallel and waits for them to complete
- Post-Activity:  syncronous orchestrator to run cleanup plugins after processing ends

#### Sequential Orchestrator
Sequential Orchestrators run a single plugin at a time, but have limited usage as they currently don't have filter criteria for the subscription.  Sequential orchestrators leverage SNS for registration/deregistration of plugins, which must be lambdas (no sns or sqs plugins are allowed at this point).  On registration, the newly added plugin is invoked with an initialization call, which allows the plugin to specify where in the process it should be run.  After the registration, the plugin is invoked with a message containing characteristics of an SNS topic.

#### Parallel Orchestrator
The Parallel Orchestrator is designed to be where the body of work is done.  Plugins register by subscribing to an SNS topic, which is invoked when plugins are supposed to start.  This means that plugins can leverage the full scope of filtering capabilities to limit when the are invoked based on SNS attributes.

The first step of a plugin at this stage is to register itself with the [OrchestratorDal](./src/dataAccessLayers/orchestratorStatusDal.ts).  On completion of the plugin, the plugin then updates its status.  In this stage, there is no time limit on how long a parallel plugin can run, so its best practice to make the plugin either fault tollarant or on an error set its status to Error.

#### Plugin
A plugin is a peice of functionality which is not deployed with the Orchestrator, but rather seperately.  It registers itself to sns topics via exported values from the orchestrator stacks.  This is the component which performs all business and communication logic.

#### Plugin with Queue
Sometimes it's important that a particular step has the ability to be resilient to failures.  In these cases we can add a queue to our plugin processing.  When adding a queue for processing its important to know that the queue can cause lambda functions to take longer to execute.  For this the orchestrator has designed a queue bridging design pattern which allows for registration immediately while allowing your queue to take the time it needs for processing and throttling.

![Queue Bridge Design](./images/bridge-pattern.png)

To implement:

Typescript plugin file:

``` typescript
import { getOrchestratorSqsPassthrough } from '@moe-tech/orchestrator';

const plugin = {
    ...
};

export const queueBridge = getOrchestratorSqsPassthrough(plugin, process.env.sqsQueue);

```

Serverless.yml file:

``` yml
...

functions:
    queueBridge:
        handler: ./path/to/ts.queueBridge
        environment:
            sqsQueue:
                Ref: sqsQueue
        iamRoleStatements:
            - Event: Allow
            Action:
                - sqs:SendMessage
            Resource:
                - Ref: sqsQueue
        events:
            - sns:
                Fn::Import: orchestrator-my-activity-parallel-processing

    yourPlugin:
        handler: ./path/to/ts.queueBridge
        events:
            - sqs:
                Ref: sqsQueue
```

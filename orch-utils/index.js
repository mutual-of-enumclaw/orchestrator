#!/usr/bin/env node
const fs = require('fs');
const { SSM } = require('aws-sdk');

async function processCliCommand() {
    console.log(process.argv);
    const args = {};
    for(let i = 2; i < process.argv.length; i++) {
        if(process.argv[i].startsWith('--')) {
            if(process.argv.length <= i + 1 || process.argv[i + 1].startsWith('--') ) {
                args[process.argv[i]] = true;
            } else {
                args[process.argv[i]] = process.argv[i + 1];
            }
        }
    }
    
    await loadActivities(args);
}

async function loadActivities(args) {

    const yamlFile = './template.yml';
    console.log(args);
    let ssmName = args['--ssm-name'];
    if(!ssmName && args['--stackery-json']) {
        const stackery = JSON.parse(process.env.STACKERY_DEPLOY_INFO);
        console.log(stackery);
        ssmName = `/${stackery.environmentName}/orchestrator/stacks/${stackery.stackName.replace(/\-/g, '')}/activities`;
    }
    console.log('ssmName', ssmName);

    const ssm = new SSM();
    const paramResponse = await ssm.getParameter({
        Name: ssmName
    }).promise();

    if(!paramResponse.Parameter) {
        console.log('Could not find parameter');
        throw new Error('Could not find parameter');
    }
    
    const activityNames = JSON.parse(paramResponse.Parameter.Value);
    console.log('Creating activities', activityNames);

    const activities = activityNames.map(name => {
        name = name.trim();
        return `
  activity${name}:
    Type: AWS::Serverless::Application
    DependsOn: OrchestratorResource
    Properties:
      Location: activity/template.yml
      Parameters:
        ParentStackName: !Ref AWS::StackName
        Name: "${name}"
        EnvironmentTagName: !Ref EnvironmentTagName
        StatusTableName: !Ref StatusTable
        StatusTableArn: !GetAtt StatusTable.Arn
        PluginTableName: !Ref PluginTable
        PluginTableArn: !GetAtt PluginTable.Arn
        OrchestratorLayerArn: !Ref Library
        OrchestratorConfig: 
          !Sub 
            - /\${EnvironmentTagName}/orchestrator/stacks/\${parmStack}/config
            - parmStack: !Join ['', !Split ['-', !Ref StackTagName]]
    `
    });
    
    let templateContent = fs.readFileSync(yamlFile).toString('utf-8');
    templateContent = templateContent.replace(
        /\#\#\n\W+\#\# Start Activities Section\n\W+\#\#\n(.|\n)*\n\W+\#\# End Activities Section\n\W+\#\#/,
        [].concat(
            `
  ##
  ## Start Activities Section
  ##`.slice(1),
    ...activities,
    `
  ##
  ## End Activities Section
  ##`
        ).join('\n'));

    fs.writeFileSync(yamlFile, templateContent);
}

processCliCommand()
    .then(() => { 
        console.log('Complete'); 
        process.exit(0);
    })
    .catch((err) => {
        console.log(err);
        process.exit(1);
    });
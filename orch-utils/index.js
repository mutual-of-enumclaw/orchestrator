#!/usr/bin/env node
const fs = require('fs');
const { SSM } = require('aws-sdk');

const ssm = new SSM();

async function processCliCommand() {
    const args = {};
    for(let i = 3; i < process.argv.length; i++) {
        if(process.argv[i].startsWith('--')) {
            if(process.argv.length <= i + 1 || process.argv[i + 1].startsWith('--') ) {
                args[process.argv[i]] = true;
            } else {
                args[process.argv[i]] = process.argv[i + 1];
            }
        }
    }
    switch(process.argv[2]) {
        case 'activities':
            console.log('Creating orchestrator activities');
            await loadActivities(args);
            break;
    }
}

async function loadActivities(args) {
    const yamlFile = './template.yml';
    const paramResponse = await ssm.getParameter({
        Name: args['--ssm-name']
    }).promise();

    if(!paramResponse.Parameter) {
        console.log('Could not find parameter');
        return -1;
    }
    
    const activityNames = paramResponse.Parameter.Value.split(',');
    console.log('Creating activities', activityNames);

    const activities = activityNames.map(name => {
        name = name.trim();
        return `
  activity${name}:
    Type: AWS::Serverless::Application
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
    `
    });

    
    let templateContent = fs.readFileSync(yamlFile).toString('utf-8');
    templateContent = templateContent.replace(
        /\#\#\n\W+\#\# Start Activities Section\n\W+\#\#\n(.|\n)*\n\W+\#\# End Activities Section\n\W+\#\#/,
        [].concat(
            `
  ##
  ## Start Activities Section
  ##`,
    ...activities,
    `
  ##
  ## End Activities Section
  ##`
        ).join('\n'));

    fs.writeFileSync(yamlFile, templateContent);
    return 0;
}


processCliCommand();
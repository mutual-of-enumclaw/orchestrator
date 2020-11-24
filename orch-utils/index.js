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
        return `
        activity${name}:
            Type: AWS::Serverless::Application
            Properties:
                Location: activity/template.yml
                Parameters:
                    Name: "${name}"
                    StatusTableName: !Ref StatusTable
                    StatusTableArn: !GetAtt StatusTable.Arn
                    PluginTableName: !Ref PluginTable
                    PluginTableArn: !GetAtt PluginTable.Arn
        `
    });

    
    const templateContent = fs.readFileSync('./template.yaml').toString('utf-8');
    templateContent.replace(
        /\#\#\n\W+\#\# Start Activities Section\n\W+\#\#\n.*\n\W+\#\# End Activities Section\n\W+\#\#/,
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

    
    return 0;
}


processCliCommand();
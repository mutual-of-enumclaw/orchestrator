const orchestrator = require('@moe-tech/orchestrator');

function plugin(workflowData) {
    console.log('It worked');
    console.log(JSON.stringify(workflowData));
}

exports.plugin = orchestrator.orchestratorWrapperSns(
    {
        pluginName: 'Step 1',
        default: {
            mandatory: true
        },
        description: 'This function is an example of an asyncronous plugin'
    },
    plugin);

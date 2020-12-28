const orchestrator = require('@moe-tech/orchestrator');


function plugin(workflowData) {
    console.log('It worked: ' + process.env.stage);
    console.log(process.env.OrchestratorConfig);
    console.log(JSON.stringify(workflowData));
}

module.exports.plugin = orchestrator.orchestratorWrapperSns(
    {
        pluginName: 'Step 1 - ' + process.env.stage,
        default: {
            mandatory: true
        }
    },
    plugin);

/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var main;

main = function (argv, callback) {
    'use strict';
    var path = require('path'),
        gmeConfig = require(path.join(process.cwd(), 'config')),
        webgme = require('../../webgme'),
        Command = require('commander').Command,
        logger = webgme.Logger.create('gme:bin:import', gmeConfig.bin.log),
        program = new Command(),
        pluginConfigFilename,
        resolvedPluginConfigFilename,
        pluginConfigJson,
        projectName,
        branch,
        pluginName,
        activeNode,
        activeSelection = [], // TODO: get this as a list of IDs from command line
        managerConfig = {};

    callback = callback || function () {};

    webgme.addToRequireJsPaths(gmeConfig);

    program.option('-p, --project <name><mandatory>', 'Name of the project.');
    program.option('-b, --branch <name>', 'Name of the branch.', 'master');
    program.option('-j, --pluginConfigPath <name>',
        'Path to json file with plugin options that should be overwritten.',
        '');
    program.option('-n, --pluginName <name><mandatory>', 'Path to given plugin.');
    program.option('-s, --selectedObjID <webGMEID>', 'ID to selected component.', '');
    program.parse(argv);

    if (!(program.pluginName && program.project)) {
        program.help();
        logger.error('A project and pluginName must be specified.');
    }

    //getting program options
    projectName = program.project;
    branch = program.branch;
    pluginName = program.pluginName;
    activeNode = program.selectedObjID;
    pluginConfigFilename = program.pluginConfigPath;

    logger.info('Executing ' + pluginName + ' plugin');

    if (pluginConfigFilename) {
        resolvedPluginConfigFilename = path.resolve(pluginConfigFilename);
        pluginConfigJson = require(resolvedPluginConfigFilename);
    } else {
        pluginConfigJson = {};
    }

    //setting plugin config
    managerConfig.projectName = projectName;
    managerConfig.branch = branch;
    managerConfig.pluginName = pluginName;
    managerConfig.activeNode = activeNode;
    managerConfig.activeSelection = activeSelection;

    webgme.runPlugin.main(null, gmeConfig, managerConfig, pluginConfigJson, function (err, result) {
        if (err) {
            logger.error('execution stopped:', err, result);
            callback(err, result);
            process.exit(1);
        } else {
            logger.info('execution was successful:', err, result);
            callback(err, result);
            process.exit(0);
        }
    });
};

module.exports = {
    main: main
};

if (require.main === module) {
    main(process.argv);
}
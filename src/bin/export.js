/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var webgme = require('../../webgme'),
    program = require('commander'),
    FS = require('fs'),
    openContext,
    Storage,
    Serialization,
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:export', gmeConfig.bin.log, false),
    REGEXP = webgme.REGEXP,
    openContext = webgme.openContext,
    Storage = webgme.serverUserStorage,
    Serialization = webgme.serializer;


webgme.addToRequireJsPaths(gmeConfig);

var exportProject = function (mongoUri, projectId, branchOrCommit, callback) {
    'use strict';
    var storage,
        project,
        contextParams,
        closeContext = function (error, data) {
            try {
                project.closeProject(function () {
                    storage.closeDatabase(function () {
                        callback(error, data);
                    });
                });
            } catch (err) {
                storage.closeDatabase(function () {
                    callback(error, data);
                });
            }
        };

    gmeConfig.mongo.uri = mongoUri || gmeConfig.mongo.uri;
    storage = new Storage({globConf: gmeConfig, logger: logger.fork('storage')});

    contextParams = {
        projectName: projectId,
        branchOrCommit: branchOrCommit
    };

    openContext(storage, gmeConfig, logger, contextParams, function (err, context) {
        if (err) {
            callback(err);
            return;
        }
        project = context.project;
        Serialization.export(context.core, context.rootNode, closeContext);
    });
};

module.exports.export = exportProject;

if (require.main === module) {
    program
        .version('0.1.0')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
        .option('-p, --project-identifier [value]', 'project identifier')
        .option('-s, --source [branch/commit]', 'the branch or commit that should be exported')
        .option('-o, --out [path]', 'the path of the output file')
        .parse(process.argv);
//check necessary arguments

    if (!program.projectIdentifier) {
        console.warn('project identifier is a mandatory parameter!');
        program.help();
    }

    if (!program.source) {
        console.warn('source is a mandatory parameter!');
        program.help();
    }
    if (!REGEXP.BRANCH.test(program.source) && !REGEXP.HASH.test(program.source)) {
        console.warn('source format is invalid!');
        program.help();
    }

    //calling the export function
    exportProject(program.mongoDatabaseUri, program.projectIdentifier, program.source,
        function (err, jsonProject) {
            'use strict';
            if (err) {
                console.error('error during project export: ', err);
                process.exit(1);
            } else {
                if (program.out) {
                    try {
                        FS.writeFileSync(program.out, JSON.stringify(jsonProject, null, 2));
                        console.log('project \'' + program.projectIdentifier +
                            '\' hase been successfully written to \'' + program.out + '\'');
                        process.exit(0);
                    } catch (err) {
                        console.error('failed to create output file: ' + err);
                        process.exit(1);
                    }
                } else {
                    console.log('project \'' + program.projectIdentifier + '\':');
                    console.log(JSON.stringify(jsonProject, null, 2));
                    process.exit(0);
                }
            }

        }
    );
}
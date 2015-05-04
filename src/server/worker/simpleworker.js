/*globals requireJS*/
/*jshint node:true*/

'use strict';

// graceful ending of the child process
process.on('SIGINT', function () {
    //FIXME: AUTH.unload
    if (logger) {
        logger.debug('stopping child process');
        if (storage) {
            storage.closeDatabase(function (err) {
                if (err) {
                    logger.error(err);
                    process.exit(1);
                } else {
                    logger.debug('child process finished');
                    process.exit(0);
                }
            });
        }
    } else {
        console.error('child was killed without initialization');
        process.exit(1);
    }
});

var WEBGME = require(__dirname + '/../../../webgme'),

    Core = requireJS('common/core/core'),
    GUID = requireJS('common/util/guid'),
    DUMP = requireJS('common/core/users/dumpmore'),
    ConnectedStorage = requireJS('common/storage/clientstorage'),
    Serialization = requireJS('common/core/users/serialization'),
    BlobClient = requireJS('common/blob/BlobClient'),
    PluginManagerBase = requireJS('plugin/PluginManagerBase'),
    PluginResult = requireJS('plugin/PluginResult'),
    PluginMessage = requireJS('plugin/PluginMessage'),
    openContext = requireJS('common/util/opencontext'),

    FS = require('fs'),

    GMEAUTH = require('../middleware/auth/gmeauth'),
    CONSTANT = require('./constants'),
    Storage = require('../storage/serveruserstorage'),
    Logger = require('../logger'),

    storage = null,
    core = null,
    result = null,
    resultReady = false,
    resultRequested = false,
    resultId = null,
    error = null,
    initialized = false,
    AUTH = null,
    _addOn = null,
    gmeConfig,
    logger,

//functions
    safeSend = function (msg) {
        if (initialized) {
            logger.debug('sending message', {metadata: msg});
        } else {
            //console.log('sending message', {metadata: msg});
        }
        try {
            process.send(msg);
        } catch (e) {
            if (initialized) {
                logger.error('sending message failed', {metadata: msg, e: e});
            } else {
                console.error('sending message failed', {metadata: msg, e: e});
            }
            //TODO check if we should separate some case
            process.exit(0);
        }
    },

    initResult = function () {
        core = null;
        result = null;
        resultReady = false;
        resultRequested = false;
        resultId = null;
        error = null;
    },

    initialize = function (parameters) {
        if (initialized !== true) {
            initialized = true;
            gmeConfig = parameters.gmeConfig;
            WEBGME.addToRequireJsPaths(gmeConfig);
            logger = Logger.create('gme:server:worker:simpleworker:pid_' + process.pid, gmeConfig.server.log, true);
            logger.debug('initializing');

            storage = new Storage({
                logger: logger.fork('storage'),
                globConf: gmeConfig
            });
            logger.debug('created storage');
            storage.openDatabase(function (err) {
                if (err) {
                    initialized = false;
                    storage = null;
                    safeSend({
                        pid: process.pid,
                        type: CONSTANT.msgTypes.info,
                        info: 'worker initialization failed, try again'
                    });
                } else {
                    logger.debug('opened database for storage');
                    if (gmeConfig.authentication.enable === true) {
                        logger.debug('adding GME auth');
                        AUTH = GMEAUTH({}, gmeConfig); //FIXME: Should session really be empty object??
                        AUTH.connect(function (err) {
                            if (err) {
                                initialized = false;
                                AUTH = null;
                                storage = null;
                                safeSend({
                                    pid: process.pid,
                                    type: CONSTANT.msgTypes.info,
                                    info: 'worker initialization failed, try again'
                                });
                                return;
                            }
                            safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialized});
                        });
                    } else {
                        safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialized});
                    }
                }
            });
        } else {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialized});
        }
    },

    exportLibrary = function (name, hash, libraryRootPath, callback) {

        storage.openProject(name, function (err, project) {
            if (err) {
                return callback(err);
            }
            var core = new Core(project, {globConf: gmeConfig, logger: logger.fork('exportLibrary:core')});
            core.loadRoot(hash, function (err, root) {
                if (err) {
                    return callback(err);
                }

                core.loadByPath(root, libraryRootPath, function (err, libraryRoot) {
                    if (err) {
                        return callback(err);
                    }

                    Serialization.export(core, libraryRoot, callback);
                });
            });
        });

    },

    dumpMoreNodes = function (name, hash, nodePaths, callback) {
        storage.openProject(name, function (err, project) {
            if (err) {
                callback(err);
            } else {
                var core = new Core(project, {globConf: gmeConfig, logger: logger.fork('dumpMoreNodes:core')});
                core.loadRoot(hash, function (err, root) {
                    if (err) {
                        callback(err);
                    } else {
                        var nodes = [],
                            needed = nodePaths.length || 0,
                            loadError = null,
                            objectLoaded = function (err, node) {
                                loadError = loadError || err;
                                if (node !== undefined && node !== null) {
                                    nodes.push(node);
                                }
                                if (--needed === 0) {
                                    if (loadError) {
                                        callback(loadError);
                                    } else {
                                        DUMP(core, nodes, '', 'guid', callback);
                                    }
                                }
                            };
                        if (needed > 0) {
                            for (var i = 0; i < nodePaths.length; i++) {
                                core.loadByPath(root, nodePaths[i], objectLoaded);
                            }
                        } else {
                            callback(null, null);
                        }
                    }
                });
            }
        });
    },

//TODO the getContext should be refactored!!!
    getConnectedStorage = function (webGMESessionId, callback) {
        var connStorage = new ConnectedStorage({
            globConf: gmeConfig,
            type: 'node',
            host: (gmeConfig.server.https.enable === true ? 'https' : 'http') + '://127.0.0.1',
            logger: logger.fork('clientstorage' + process.pid, gmeConfig.server.log),
            webGMESessionId: webGMESessionId
        });
        connStorage.openDatabase(function (err) {
            callback(err, connStorage);
        });
    },

    getConnectedProject = function (storage, projectName, callback) {
        storage.getProjectNames(function (err, names) {
            if (err) {
                return callback(err);
            }
            if (names.indexOf(projectName) === -1) {
                return callback(new Error('nonexsistent project'));
            }
            storage.openProject(projectName, callback);
        });
    },

    getProject = function (projectName, webGMESessionId, callback) {
        getConnectedStorage(webGMESessionId, function (err, storage) {
            if (err) {
                return callback(err);
            }
            getConnectedProject(storage, projectName, callback);
        });
    },

    getPlugin = function (name) {
        return requireJS('plugin/' + name + '/' + name + '/' + name);
    },

    executePlugin = function (userId, name, webGMESessionId, context, callback) {
        var interpreter = getPlugin(name);
        if (interpreter) {
            getProject(context.managerConfig.project, webGMESessionId, function (err, project) {
                if (!err) {
                    project.setUser(userId);
                    var plugins = {};
                    plugins[name] = interpreter;
                    var manager = new PluginManagerBase(project, Core, logger, plugins, gmeConfig);
                    context.managerConfig.blobClient = new BlobClient({
                        serverPort: gmeConfig.server.port,
                        httpsecure: gmeConfig.server.https.enable,
                        server: '127.0.0.1',
                        webgmeclientsession: webGMESessionId
                    });

                    manager.initialize(null, function (pluginConfigs, configSaveCallback) {
                        if (configSaveCallback) {
                            configSaveCallback(context.pluginConfigs);
                        }
                        manager.executePlugin(name, context.managerConfig, function (err, result) {
                            if (!err && result) {
                                callback(null, result.serialize());
                            } else {
                                var newErrorPluginResult = new PluginResult();
                                callback(err, newErrorPluginResult.serialize());
                            }
                        });

                    });
                } else {
                    var newErrorPluginResult = new PluginResult();
                    logger.error('unable to get project');
                    callback(new Error('unable to get project'), newErrorPluginResult.serialize());
                }
            });
        } else {
            var newErrorPluginResult = new PluginResult();
            callback(new Error('unable to load plugin'), newErrorPluginResult.serialize());
        }
    },

    createProject = function (webGMESessionId, name, jsonProject, callback) {
        getConnectedStorage(webGMESessionId, function (err, storage) {
            if (err) {
                return callback('' + err);
            }

            storage.openProject(name, function (err, project) {
                if (err) {
                    return callback('' + err);
                }

                var core = new Core(project, {globConf: gmeConfig, logger: logger.fork('createProject:core')}),
                    root = core.createNode({parent: null, base: null});
                Serialization.import(core, root, jsonProject, function (err) {
                    if (err) {
                        return storage.deleteProject(name, function () {
                            callback('' + err);
                        });
                    }

                    core.persist(root, function (/*err*/) {
                    });
                    var rhash = core.getHash(root),
                        chash = project.makeCommit([], rhash, 'project imported', function (/*err*/) {
                        });
                    project.getBranchHash('master', '#hack', function (err, oldhash) {
                        if (err) {
                            return callback('' + err);
                        }
                        project.setBranchHash('master', oldhash, chash, callback);
                    });
                });
            });
        });
    },

    getAllProjectsInfo = function (userId, callback) {
        // TODO: if authentication is turned on,
        // just query the users database for the list of projects for which the user is authorized
        var projectNames,
            userAuthInfo = null,
            completeInfo = {},
            needed,
            i,
            filterProjectList = function (cb) {
                if (AUTH === null) {
                    return cb(null);
                }

                if (typeof userId === 'string') {
                    AUTH.getUserAuthInfo(userId, function (err, userData) {
                        if (err) {
                            projectNames = [];
                            return cb(err);
                        }

                        userAuthInfo = userData;

                        //the actual filtering
                        var i, filtered = [];
                        for (i = 0; i < projectNames.length; i++) {
                            if (userAuthInfo[projectNames[i]]) {
                                filtered.push(projectNames[i]);
                            }
                        }
                        projectNames = filtered;
                        cb(null);
                    });
                } else {
                    projectNames = []; //we have authentication yet doesn't get valid user name...
                    return cb(new Error('invalid user'));

                }
            },
            addUserAuthInfo = function (projectName) {
                if (userAuthInfo === null) {
                    completeInfo[projectName].rights = {read: true, write: true, delete: true};
                } else {
                    completeInfo[projectName].rights = userAuthInfo[projectName] || {
                        read: false,
                        write: false,
                        delete: false
                    };
                }
            },
            getProjectInfo = function (name, cb) {
                storage.openProject(name, function (err, project) {
                    var needed = 2,
                        info = {info: null, branches: {}},
                        error = null;

                    if (err) {
                        return cb(err);
                    }

                    project.getBranchNames(function (err, branches) {
                        error = error || err;
                        if (!err && branches) {
                            info.branches = branches;
                        }

                        if (--needed === 0) {
                            return cb(error, name, info);
                        }
                    });
                    project.getInfo(function (err, i) {
                        error = error || err;

                        if (!err && i) {
                            info.info = i;
                        }

                        if (--needed === 0) {
                            return cb(error, name, info);
                        }
                    });
                });
            },
            projectInfoReceived = function (err, name, info) {
                if (!err) {
                    completeInfo[name] = {info: info.info, branches: info.branches};
                    addUserAuthInfo(name);
                }

                if (--needed === 0) {
                    //TODO here we first should go and add the user right info
                    callback(null, completeInfo);
                }
            };

        storage.getProjectNames(function (err, projectlist) {
            if (err) {
                return callback(new Error('cannot get project name list'));
            }
            projectNames = projectlist;
            filterProjectList(function (err) {
                if (err) {
                    callback(err);
                }
                needed = projectNames.length;
                if (needed > 0) {
                    for (i = 0; i < projectNames.length; i++) {
                        getProjectInfo(projectNames[i], projectInfoReceived);
                    }
                } else {
                    return callback(new Error('there is no project on server'));
                }
            });
        });
    },

    setProjectInfo = function (webGMESessionId, projectId, info, callback) {
        storage.getProjectNames(function (err, projectlist) {
            if (err) {
                return callback(err);
            }

            if (projectlist.indexOf(projectId) === -1) {
                return callback(new Error('no such project'));
            }
            getProject(projectId, webGMESessionId, function (err, project) {
                if (err) {
                    return callback(err);
                }

                project.setInfo(info, callback);
            });
        });
    },

    getProjectInfo = function (webGMESessionId, projectId, callback) {
        storage.getProjectNames(function (err, projectlist) {
            if (err) {
                return callback(err);
            }

            if (projectlist.indexOf(projectId) === -1) {
                return callback(new Error('no such project'));
            }
            getProject(projectId, webGMESessionId, function (err, project) {
                if (err) {
                    return callback(err);
                }

                project.getInfo(callback);
            });
        });
    },

    getAllInfoTags = function (webGMESessionId, callback) {
        var i, tags = {},
            needed,
            projectLoaded = function (err, project) {
                if (!err && project) {
                    project.getInfo(infoArrived);
                } else {
                    if (--needed === 0) {
                        callback(null, tags);
                    }
                }
            },
            infoArrived = function (err, info) {
                //TODO now this function wires the info.tags structure...
                var keys, i;
                if (!err && info) {
                    keys = Object.keys(info.tags || {});
                    for (i = 0; i < keys.length; i++) {
                        tags[keys[i]] = info.tags[keys[i]];
                    }
                }

                if (--needed === 0) {
                    callback(null, tags);
                }
            };
        storage.getProjectNames(function (err, projectlist) {
            if (err) {
                return callback(err);
            }

            needed = projectlist.length;
            for (i = 0; i < projectlist.length; i++) {
                getProject(projectlist[i], webGMESessionId, projectLoaded);
            }
        });
    },

    setBranch = function (webGMESessionId, projectName, branchName, oldHash, newHash, callback) {
        storage.getProjectNames(function (err, projectlist) {
            if (err) {
                return callback(err);
            }

            if (projectlist.indexOf(projectName) === -1) {
                return callback(new Error('no such project'));
            }
            getProject(projectName, webGMESessionId, function (err, project) {
                if (err) {
                    return callback(err);
                }

                project.setBranchHash(branchName, oldHash, newHash, callback);
            });
        });
    },

    getAvailableSeedNames = function () {
        var result = [],
            i, names, j;
        if (gmeConfig.seedProjects.enable !== true) {
            return result;
        }

        try {
            for (i = 0; i < gmeConfig.seedProjects.basePaths.length; i++) {
                names = FS.readdirSync(gmeConfig.seedProjects.basePaths[i]);
                for (j = 0; j < names.length; j++) {
                    if (names[j].slice(-5) === '.json' && result.indexOf(names[j].slice(0, -5)) === -1) {
                        result.push(names[j].slice(0, -5));
                    }
                }
            }
        } catch (e) {
            return result;
        }

        return result;
    },

    getSeedInfo = function (userId, callback) {
        var result = {},
            createChecked = function () {
                getAllProjectsInfo(userId, function (err, fullProjectInfo) {
                    result.db = Object.keys(fullProjectInfo || {});

                    callback(null, result);
                });
            };

        result.db = [];
        result.file = getAvailableSeedNames();
        if (AUTH) {
            AUTH.getAllUserAuthInfo(userId, function (err, userData) {
                if (err) {
                    return callback(err);
                }

                if (!userData.canCreate) {
                    callback(null, result);
                }

                createChecked();
            });
        } else {
            createChecked();
        }
    },

    getSeedFromFile = function (name) {
        var i, names;
        if (gmeConfig.seedProjects.enable !== true) {
            return null;
        }

        try {
            for (i = 0; i < gmeConfig.seedProjects.basePaths.length; i++) {
                names = FS.readdirSync(gmeConfig.seedProjects.basePaths[i]);
                if (names.indexOf(name + '.json') !== -1) {
                    return JSON.parse(
                        FS.readFileSync(gmeConfig.seedProjects.basePaths[i] + '/' + name + '.json', 'utf8')
                    );
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    getSeedFromDb = function (name, branch, commit, callback) {
        var contextParameters = {
            projectName: name,
            createProject: false,
            overwriteProject: false
        };
        if (commit) {
            contextParameters.commitHash = commit;
        } else {
            contextParameters.branchName = branch || 'master';
        }
        openContext(storage, gmeConfig, logger, contextParameters, function (err, result) {
            if (err) {
                return callback(err);
            }

            Serialization.export(result.core, result.rootNode, callback);
        });
    },

    seedProject = function (parameters, callback) {
        //check if the seed can be found
        //try to export the seed
        //try to create a new project from the seed
        var checkRights = function () {
                storage.getProjectNames(function (err, names) {
                    if (err) {
                        return fail(err);
                    }

                    if (names.indexOf(parameters.projectName) !== -1) {
                        return fail('cannot overwrite project with seeding');
                    }

                    if (AUTH) {
                        AUTH.getAllUserAuthInfo(parameters.userId, function (err, authInfo) {
                            logger.debug('userInfo', authInfo);
                            if (err) {
                                return fail(err);
                            }

                            if (authInfo.canCreate !== true) {
                                return fail('user cannot create project');
                            }

                            rightsChecked();
                        });
                    } else {
                        rightsChecked();
                    }
                });
            },
            rightsChecked = function () {
                if (parameters.type === 'file') {
                    seed = getSeedFromFile(parameters.seedName);
                    if (seed === null) {
                        return fail('unknown file seed');
                    }
                    return createProjectfromSeed();
                }

                getSeedFromDb(parameters.seedName,
                    parameters.seedBranch,
                    parameters.seedCommit,
                    function (err, result) {
                        if (err || result === null) {
                            return fail(err || 'unable to get seed project');
                        }

                        seed = result;
                        createProjectfromSeed();
                    }
                );
            },
            createProjectfromSeed = function () {
                var contextParameters = {
                    projectName: parameters.projectName,
                    branchName: parameters.branch || 'master',
                    createProject: true,
                    overwriteProject: false
                };
                openContext(storage, gmeConfig, logger, contextParameters, function (err, result) {
                    if (err) {
                        return fail(err);
                    }
                    Serialization.import(result.core, result.rootNode, seed, function (err) {
                        if (err) {
                            return fail(err);
                        }
                        result.core.persist(result.rootNode, function (err) {
                            if (err) {
                                return fail(err);
                            }

                            var newCommit = result.project.makeCommit([result.commitHash],
                                result.core.getHash(result.rootNode),
                                'seeding project[' + parameters.seedName + ']',
                                function (/*err*/) {
                                }
                            );

                            result.project.setBranchHash(contextParameters.branchName,
                                result.commitHash,
                                newCommit,
                                function (err) {
                                    if (err) {
                                        return fail(err);
                                    }
                                    //we should add the newly created project to the user so he can manipulate it
                                    if (AUTH) {
                                        AUTH.authorizeByUserId(parameters.userId,
                                            contextParameters.projectName,
                                            'create',
                                            {
                                                read: true,
                                                write: true,
                                                delete: true
                                            },
                                            function (err) {
                                                if (err) {
                                                    return fail(err);
                                                }
                                                callback(null);
                                            }
                                        );
                                    } else {
                                        callback(null);
                                    }
                                }
                            );
                        });
                    });
                });
            },
            fail = function (error) {
                callback(error);
            },
            seed = {};

        checkRights();
    },

//addOn functions
    getAddOn = function (name) {
        return requireJS('addon/' + name + '/' + name + '/' + name);
    },

    initConnectedWorker = function (name, webGMESessionId, projectName, branchName, callback) {
        if (!name || (AUTH && !webGMESessionId) || !projectName || !branchName) {
            return setImmediate(callback, 'Required parameter was not provided');
        }
        var AddOn = getAddOn(name),
            connStorage = null;
        //for instance creation we need the Core class and the Storage object
        getConnectedStorage(webGMESessionId, function (err, cs) {
            if (!err && cs) {
                connStorage = cs;
                _addOn = new AddOn(Core, connStorage, gmeConfig);
                //for the initialization we need the project as well
                getConnectedProject(connStorage, projectName, function (err, project) {
                    if (err) {
                        return callback(err);
                    }
                    logger.debug('starting addon', {metadata: name});
                    _addOn.start({
                        projectName: projectName,
                        branchName: branchName,
                        project: project,
                        logger: logger.fork(name)
                    }, callback);
                });
            } else {
                callback('unable to connect user\'s storage: ' + err);
            }
        });
    },

    connectedWorkerQuery = function (parameters, callback) {
        if (_addOn) {
            _addOn.query(parameters, callback);
        } else {
            callback('the addon is not running');
        }
    },

    connectedworkerStop = function (callback) {
        if (_addOn) {
            logger.debug('stopping addon', {metadata: _addOn.getName()});
            _addOn.stop(function (err) {
                if (err) {
                    return callback(err);
                }
                _addOn = null;
                callback(null);
            });
        } else {
            callback(null);
        }
    };


//main message processing loop
process.on('message', function (parameters) {
    var resultHandling = function (err, r) {
        r = r || null;
        if (resultRequested === true) {
            initResult();
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.result, error: err, result: r});
        } else {
            resultReady = true;
            error = err;
            result = r;
        }
    };

    parameters = parameters || {};
    parameters.command = parameters.command || CONSTANT.workerCommands.getResult; //default command

    if (!initialized && parameters.command !== CONSTANT.workerCommands.initialize) {
        return safeSend({pid: process.pid,
            type: CONSTANT.msgTypes.request,
            error: 'worker has not been initialized yet',
            resid: null
        });
    }

    if (parameters.command === CONSTANT.workerCommands.initialize) {
        return initialize(parameters);
    }

    storage.openDatabase(function (err) {
        if (err) {
            return safeSend({pid: process.pid,
                type: CONSTANT.msgTypes.request,
                error: 'unable to initiate database connection',
                resid: null
        });
        }

        resultId = GUID();
        if (parameters.command === CONSTANT.workerCommands.dumpMoreNodes) {
            if (typeof parameters.name === 'string' &&
                typeof parameters.hash === 'string' &&
                parameters.nodes && parameters.nodes.length) {
                safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
                dumpMoreNodes(parameters.name, parameters.hash, parameters.nodes, resultHandling);
            } else {
                initResult();
                safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: 'invalid parameters'});
            }
        } else if (parameters.command === CONSTANT.workerCommands.generateJsonURL) {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            resultHandling(null, parameters.object);
        } else if (parameters.command === CONSTANT.workerCommands.getResult) {
            if (resultReady === true) {
                var e = error,
                    r = result;

                initResult();
                safeSend({pid: process.pid, type: CONSTANT.msgTypes.result, error: e, result: r});
            } else {
                resultRequested = true;
            }
        } else if (parameters.command === CONSTANT.workerCommands.executePlugin) {
            if (gmeConfig.plugin.allowServerExecution) {
                if (typeof parameters.name === 'string' && typeof parameters.context === 'object') {
                    executePlugin(parameters.userId,
                        parameters.name,
                        parameters.webGMESessionId,
                        parameters.context,
                        function (err, result) {
                            safeSend({pid: process.pid, type: CONSTANT.msgTypes.result, error: err, result: result});
                        });
                } else {
                    initResult();
                    safeSend({pid: process.pid,
                        type: CONSTANT.msgTypes.result,
                        error: 'invalid parameters',
                        result: {}
                    });
                }
            } else {
                initResult();
                var pluginResult = new PluginResult(),
                    pluginMessage = new PluginMessage();
                pluginMessage.severity = 'error';
                pluginMessage.message = 'plugin execution on server side is disabled';
                pluginResult.setSuccess(false);
                pluginResult.pluginName = parameters.name;
                pluginResult.addMessage(pluginMessage);
                pluginResult.setStartTime((new Date()).toISOString());
                pluginResult.setFinishTime((new Date()).toISOString());
                pluginResult.setError(pluginMessage.message);
                safeSend({pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: null,
                    result: pluginResult.serialize()
                });
            }
        } else if (parameters.command === CONSTANT.workerCommands.exportLibrary) {
            if (typeof parameters.name === 'string' &&
                typeof parameters.hash === 'string' &&
                typeof parameters.path === 'string') {
                safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
                exportLibrary(parameters.name, parameters.hash, parameters.path, resultHandling);
            } else {
                initResult();
                safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: 'invalid parameters'});
            }
        } else if (parameters.command === CONSTANT.workerCommands.createProjectFromFile) {
            if (typeof parameters.name === 'string' && typeof parameters.json === 'object') {
                safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
                createProject(parameters.webGMESessionId, parameters.name, parameters.json, resultHandling);
            } else {
                initResult();
                safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: 'invalid parameters'});
            }
        } else if (parameters.command === CONSTANT.workerCommands.getAllProjectsInfo) {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            getAllProjectsInfo(parameters.userId, resultHandling);
        } else if (parameters.command === CONSTANT.workerCommands.setProjectInfo) {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            setProjectInfo(parameters.webGMESessionId, parameters.projectId, parameters.info || {}, resultHandling);
        } else if (parameters.command === CONSTANT.workerCommands.getProjectInfo) {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            getProjectInfo(parameters.webGMESessionId, parameters.projectId, resultHandling);
        } else if (parameters.command === CONSTANT.workerCommands.getAllInfoTags) {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            getAllInfoTags(parameters.webGMESessionId, resultHandling);
        } else if (parameters.command === CONSTANT.workerCommands.setBranch) {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            setBranch(parameters.webGMESessionId,
                parameters.project,
                parameters.branch,
                parameters.old,
                parameters.new,
                resultHandling);
        } else if (parameters.command === CONSTANT.workerCommands.getSeedInfo) {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            getSeedInfo(parameters.userId, resultHandling);
        } else if (parameters.command === CONSTANT.workerCommands.seedProject) {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            seedProject(parameters, resultHandling);
        } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerStart) {
            if (gmeConfig.addOn.enable === true) {
                initConnectedWorker(parameters.workerName,
                    parameters.webGMESessionId,
                    parameters.project,
                    parameters.branch, function (err) {
                        if (err) {
                            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: err, resid: null});
                        } else {
                            safeSend({pid: process.pid,
                                type: CONSTANT.msgTypes.request,
                                error: null,
                                resid: process.pid
                            });
                        }
                    });
            } else {
                safeSend({pid: process.pid,
                    type: CONSTANT.msgTypes.request,
                    error: 'addOn functionality not enabled',
                    resid: null
                });
            }
        } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerQuery) {
            if (gmeConfig.addOn.enable === true) {
                connectedWorkerQuery(parameters, function (err, result) {
                    safeSend({pid: process.pid, type: CONSTANT.msgTypes.query, error: err, result: result});
                });
            } else {
                safeSend({pid: process.pid,
                    type: CONSTANT.msgTypes.request,
                    error: 'addOn functionality not enabled',
                    resid: null
                });
            }
        } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerStop) {
            if (gmeConfig.addOn.enable === true) {
                connectedworkerStop(function (err) {
                    safeSend({pid: process.pid, type: CONSTANT.msgTypes.result, error: err, result: null});
                });
            } else {
                safeSend({pid: process.pid,
                    type: CONSTANT.msgTypes.request,
                    error: 'addOn functionality not enabled',
                    resid: null
                });
            }
        } else {
            safeSend({pid: process.pid,
                type: CONSTANT.msgTypes.request,
                error: 'unknown command',
                resid: null
            });
        }
    });
});

safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialize});
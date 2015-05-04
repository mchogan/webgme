/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'common/util/assert',
    'common/util/key',
    'common/regexp'
], function (ASSERT, GENKEY, REGEXP) {
    'use strict';

    function Database(_database, _options) {
        ASSERT(typeof _database === 'object');
        ASSERT(typeof _options === 'object');
        ASSERT(typeof _options.globConf === 'object');
        ASSERT(typeof _options.logger !== 'undefined');

        var gmeConfig = _options.globConf,
            logger = _options.logger.fork('commit');

        logger.debug('Initializing');

        function openProject(projectName, callback) {

            var _project = null,
                projectLogger = logger.fork('project:' + projectName);
            projectLogger.debug('Initializing');

            _database.openProject(projectName, function (err, proj) {
                if (!err && proj) {
                    _project = proj;
                    callback(null, {
                        fsyncDatabase: _project.fsyncDatabase,
                        closeProject: _project.closeProject,
                        loadObject: _project.loadObject,
                        insertObject: _project.insertObject,
                        getInfo: _project.getInfo,
                        setInfo: _project.setInfo,
                        findHash: _project.findHash,
                        dumpObjects: _project.dumpObjects,
                        getBranchNames: _project.getBranchNames,
                        getBranchHash: _project.getBranchHash,
                        setBranchHash: _project.setBranchHash,
                        getCommits: _project.getCommits,
                        getCommonAncestorCommit: _project.getCommonAncestorCommit,
                        makeCommit: makeCommit,
                        setUser: setUser,
                        ID_NAME: _project.ID_NAME
                    });
                } else {
                    callback(err, proj);
                }
            });

            function makeCommit(parents, roothash, msg, callback) {
                projectLogger.debug('makeCommit', {metadata: arguments});
                ASSERT(REGEXP.HASH.test(roothash));
                ASSERT(typeof callback === 'function');

                parents = parents || [];
                msg = msg || 'n/a';

                var commitObj = {
                    root: roothash,
                    parents: parents,
                    updater: [_options.user],
                    time: (new Date()).getTime(),
                    message: msg,
                    type: 'commit'
                };

                var id = '#' + GENKEY(commitObj, gmeConfig);
                commitObj[_project.ID_NAME] = id;

                _project.insertObject(commitObj, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, id);
                    }
                });

                return id;
            }

            function setUser(userId) {
                projectLogger.debug('setUser', {metadata: arguments});

                if (typeof userId === 'string') {
                    _options.user = userId;
                }
            }

            projectLogger.debug('Ready');
        }

        logger.debug('Ready');

        return {
            openDatabase: _database.openDatabase,
            closeDatabase: _database.closeDatabase,
            fsyncDatabase: _database.fsyncDatabase,
            getProjectNames: _database.getProjectNames,
            getAllowedProjectNames: _database.getAllowedProjectNames,
            getAuthorizationInfo: _database.getAuthorizationInfo,
            getDatabaseStatus: _database.getDatabaseStatus,
            openProject: openProject,
            deleteProject: _database.deleteProject,
            simpleRequest: _database.simpleRequest,
            simpleResult: _database.simpleResult,
            simpleQuery: _database.simpleQuery,
            getNextServerEvent: _database.getNextServerEvent,
            getToken: _database.getToken
        };
    }

    return Database;
});

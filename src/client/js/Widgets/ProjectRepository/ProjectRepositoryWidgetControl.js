/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/logger'], function (Logger) {
    'use strict';

    var RepositoryLogControl;

    RepositoryLogControl = function (myClient, myView) {
        var self = this;

        self._client = myClient;
        self._view = myView;

        self._lastCommitID = null;

        //override view event handlers
        self._view.onLoadCommit = function (params) {
            self._client.selectCommitAsync(params.id, function (err) {
                if (err) {
                    self._logger.error(err);
                }

                self._refreshActualCommit();
            });
        };

        self._view.onDeleteBranchClick = function (branch) {
            self._client.deleteBranchAsync(branch, function (err) {
                if (err) {
                    self._logger.error(err);
                }

                self._refreshBranches();
                self._refreshActualCommit();
            });
        };

        self._view.onCreateBranchFromCommit = function (params) {
            self._client.createBranchAsync(
                params.name,
                params.commitId,
                function (err) {
                    if (err) {
                        self._logger.error(err);
                    }
                    self._refreshBranches();
                });
        };

        self._view.onLoadMoreCommits = function (num) {
            self._loadMoreCommits(num);
        };

        self._logger = Logger.create(
            'gme:Widgets:ProjectRepository:ProjectRepositoryWidgetControl_RepositoryLogControl',
            WebGMEGlobal.gmeConfig.client.log);
        self._logger.debug('Created');
    };

    RepositoryLogControl.prototype._loadMoreCommits = function (num) {
        var commits = null,
            com,
            commitsLoaded,
            self = this;

        commitsLoaded = function (err, data) {
            var i,
                cLen,
                commitObject;

            self._logger.debug('commitsLoaded, err: \'' + err + '\', data: ' + data === true ? data.length : 'null');

            if (err) {
                if (_.isEmpty(err)) {
                    self._logger.error('the mysterious error returned by "getCommitsAsync"');
                } else {
                    self._logger.error(err);
                }
            } else {
                commits = data.concat([]);

                cLen = commits.length;
                if (cLen > 0) {
                    for (i = 0; i < cLen; i += 1) {
                        com = commits[i];

                        if (self._lastCommitID !== com._id) {

                            commitObject = {
                                id: com._id,
                                message: com.message,
                                parents: com.parents,
                                timestamp: com.time,
                                user: com.updater.join(',')
                            };

                            self._view.addCommit(commitObject);
                        }
                    }

                    //store last CommitID we received
                    self._lastCommitID = commits[i - 1]._id;

                    //render added commits
                    self._view.render();

                    self._refreshActualCommit();

                    self._refreshBranches();
                }

                self._view.hideProgressbar();

                if (cLen < num) {
                    self._view.noMoreCommitsToDisplay();
                }
            }
        };

        self._view.showProgressbar();

        self._client.getCommitsAsync(this._lastCommitID, num, commitsLoaded);
    };

    RepositoryLogControl.prototype._refreshActualCommit = function () {
        this._view.setActualCommitId(this._client.getActualCommit());
    };

    RepositoryLogControl.prototype._refreshBranches = function () {
        var self = this;

        self._view.clearBranches();

        self._client.getBranchesAsync(function (err, data) {
            var i;

            self._logger.debug('branchesLoaded, err: \'' + err + '\', data: ' + data ? data.length : 'null');

            if (err) {
                self._logger.error(err);
            }
            if (data && data.length) {
                //set view's branch info
                i = data.length;

                while (i--) {
                    self._view.addBranch({
                        name: data[i].name,
                        commitId: data[i].commitId,
                        sync: data[i].sync
                    });
                }
            }
        });
    };

    return RepositoryLogControl;
});
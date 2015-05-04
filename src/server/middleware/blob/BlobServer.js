/*globals requireJS*/
/*jshint node:true*/

/**
 * @author ksmyth / https://github.com/ksmyth
 */

'use strict';

var mime = require('mime'),
    BlobMetadata = requireJS('blob/BlobMetadata'),
    ASSERT = requireJS('common/util/assert'),

    contentDisposition = require('content-disposition'),
    BlobFSBackend = require('./BlobFSBackend');
    //BlobFSBackend = require('./BlobS3Backend');

function createExpressBlob(__app, baseUrl, options) {
    var blobBackend,
        ensureAuthenticated,
        logger;
    ASSERT(typeof baseUrl === 'string', 'baseUrl must be given.');
    ASSERT(typeof options.gmeConfig !== 'undefined', 'gmeConfig required');
    ASSERT(options.gmeConfig.blob.type === 'FS', 'Only FS blob backend is currently supported.');
    ASSERT(typeof options.ensureAuthenticated === 'function', 'ensureAuthenticated must be given.');
    ASSERT(typeof options.logger !== 'undefined', 'logger must be given.');

    ensureAuthenticated = options.ensureAuthenticated;
    logger = options.logger.fork('middleware:BlobServer');
    blobBackend = new BlobFSBackend(options.gmeConfig);

    __app.get(baseUrl + '/metadata', ensureAuthenticated, function (req, res) {
        blobBackend.listAllMetadata(req.query.all, function (err, metadata) {
            if (err) {
                // FIXME: make sure we set the status code correctly like 404 etc.
                res.status(500);
                res.send(err);
            } else {
                res.status(200);
                res.setHeader('Content-type', 'application/json');
                res.end(JSON.stringify(metadata, null, 4));

            }
        });
    });

    __app.get(baseUrl + '/metadata/:metadataHash', ensureAuthenticated, function (req, res) {
        blobBackend.getMetadata(req.params.metadataHash, function (err, hash, metadata) {
            if (err) {
                // FIXME: make sure we set the status code correctly like 404 etc.
                res.status(500);
                res.send(err);
            } else {
                res.status(200);
                res.setHeader('Content-type', 'application/json');
                res.end(JSON.stringify(metadata, null, 4));

            }
        });
    });

    __app.post(baseUrl + '/createFile/:filename', ensureAuthenticated, function (req, res) {
        logger.debug('file creation request: user[' + req.session.udmId + '], filename[' + req.params.filename + ']');
        var filename = 'not_defined.txt';

        if (req.params.filename !== null && req.params.filename !== '') {
            filename = req.params.filename;
        }

        // regular file
        // TODO: add tags and isPublic flag
        blobBackend.putFile(filename, req, function (err, hash) {
            logger.debug('file creation request finished: user[' + req.session.udmId + '], filename[' +
                req.params.filename + '], error[' + err + '], hash:[' + hash + ']');
            if (err) {
                // FIXME: make sure we set the status code correctly like 404 etc.
                res.status(500);
                res.send(err);
            } else {
                // FIXME: it should be enough to send back the hash only
                blobBackend.getMetadata(hash, function (err, metadataHash, metadata) {
                    if (err) {
                        // FIXME: make sure we set the status code correctly like 404 etc.
                        res.status(500);
                        res.send(err);
                    } else {
                        res.status(200);
                        res.setHeader('Content-type', 'application/json');
                        var info = {};
                        info[hash] = metadata;
                        res.end(JSON.stringify(info, null, 4));
                    }
                });
            }
        });

    });

    __app.post(baseUrl + '/createMetadata', ensureAuthenticated, function (req, res) {

        var data = '';

        req.addListener('data', function (chunk) {
            data += chunk;
        });

        req.addListener('end', function () {
            var metadata;
            try {
                metadata = new BlobMetadata(JSON.parse(data));
            } catch (e) {
                res.status(500);
                res.send(e);
            }
            blobBackend.putMetadata(metadata, function (err, hash) {
                if (err) {
                    // FIXME: make sure we set the status code correctly like 404 etc.
                    res.status(500);
                    res.send(err);
                } else {
                    // FIXME: it should be enough to send back the hash only
                    blobBackend.getMetadata(hash, function (err, metadataHash, metadata) {
                        if (err) {
                            // FIXME: make sure we set the status code correctly like 404 etc.
                            res.status(500);
                            res.send(err);
                        } else {
                            res.status(200);
                            res.setHeader('Content-type', 'application/json');
                            var info = {};
                            info[hash] = metadata;
                            res.end(JSON.stringify(info, null, 4));
                        }
                    });
                }
            });
        });
    });

    var sendBlobContent = function (req, res, metadataHash, subpartPath, download) {

        blobBackend.getMetadata(metadataHash, function (err, hash, metadata) {
            if (err) {
                // FIXME: make sure we set the status code correctly like 404 etc.
                res.status(500);
                res.send(err);
            } else {
                var filename = metadata.name;

                if (subpartPath) {
                    filename = subpartPath.substring(subpartPath.lastIndexOf('/') + 1);
                }

                var mimeType = mime.lookup(filename);

                if (download || mimeType === 'application/octet-stream' || mimeType === 'application/zip') {
                    res.setHeader('Content-Disposition', contentDisposition(filename, {type: 'attachment'}));
                }
                res.setHeader('Content-type', mimeType);


                // TODO: we need to get the content and save as a local file.
                // if we just proxy the stream we cannot set errors correctly.

                blobBackend.getFile(metadataHash, subpartPath, res, function (err /*, hash*/) {
                    if (err) {
                        // chrome gives error code: ERR_INVALID_RESPONSE if we don't do this:
                        res.removeHeader('Content-disposition');
                        res.removeHeader('Content-type');
                        //give more precise description about the error type and message. Resource if not available etc.
                        res.sendStatus(500);
                    } else {
                        //res.status(200);
                    }
                });
            }
        });
    };

    __app.get(/^\/rest\/blob\/download\/([0-9a-f]{40,40})(\/(.*))?$/, ensureAuthenticated, function (req, res) {
        var metadataHash = req.params[0];
        var subpartPath = req.params[2];

        sendBlobContent(req, res, metadataHash, subpartPath, true);
    });

    __app.get(/^\/rest\/blob\/view\/([0-9a-f]{40,40})(\/(.*))?$/, ensureAuthenticated, function (req, res) {
        var metadataHash = req.params[0];
        var subpartPath = req.params[2];

        sendBlobContent(req, res, metadataHash, subpartPath, false);
    });

    // end of blob rules
}

module.exports.createExpressBlob = createExpressBlob;
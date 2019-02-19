module.exports = function (RED) {

    "use strict";
    var path = require("path");
    var swaggerjs = require('swagger-client');
    var request = require('request');

    function SwaggerClientNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', function (msg) {
            var url = config.url || msg.url;
            var api = config.api || msg.api;
            var resource = config.resource || msg.resource;
            var params = config.params || msg.params;

            if (!(url && api && resource)) {
                node.error('Missing configuration values', msg);
                return;
            }

            console.log('url: ' + url);
            //console.log('api: ' + api);
            //console.log('resource: ' + resource);
            //console.log('params: ' + JSON.stringify(params));

            if (params && params['_isModel']) {
                for (var key in params) {
                    if (key != '_isModel') {
                        try {
                            params = {
                                body: JSON.parse(params[key])
                            };
                        } catch(e){
                            node.error('Bad JSON in object: ' + key, msg);
                            return;
                        }
                        
                    }
                }
            }
            
            swaggerjs(url).then(function (client) {
                    
                //Check for missing params
                var missingParams = getMissingParams(findApiReqParams(api, resource, client), params);
                if(missingParams){
                    node.error('Missing params: ' + missingParams.toString(), msg);
                    return;
                } else {
                    client.apis[api][resource](params, {responseContentType: 'application/json'}).then(function (resp) {
                        msg.statusCode = resp.status;
                        msg.payload = resp.obj;
                        node.send(msg);
                        return;
                    }).catch(function (err) {
                        msg.statusCode = err.status;
                        msg.payload = err.obj;
                        node.send(msg);
                        return;
                    });
                }
            }).catch(function (err) {
                node.error(err, msg);
                return;
            });
        });
    }

    function findApiReqParams(api, resource, client) {
        var reqParams = [];
        var paths = client.spec.paths;
        Object.keys(paths).forEach(function (pathKey) {
            var path = paths[pathKey];
            Object.keys(path).forEach(function (operationKey) {
                var operation = path[operationKey];
                if (operation.tags && operation.tags.indexOf(api) >= 0 && operation.operationId === resource) {
                    var parameters = operation.parameters;
                    parameters.forEach(function (parameter) {
                        reqParams.push(parameter.name);
                    });
                }
            });
        });
        return reqParams;
    }

    function getMissingParams(reqParams, params) {
        var missingParams;
        for (var i=0; i< reqParams.length; i++) {
            if (!(params && params.hasOwnProperty(reqParams[i]))) {
                if (!missingParams) {
                    missingParams = [];
                }
                missingParams.push(reqParams[i]);
            }
        }
        return(missingParams || null);
    }

    RED.nodes.registerType("swagger client", SwaggerClientNode);

    function sendFile(res, filename) {
        // Use the right function depending on Express 3.x/4.x
        if (res.sendFile) {
            res.sendFile(filename);
        } else {
            res.sendfile(filename);
        }
    }

    function proxySwaggerRequest(res, url) {
        request.get(url, function (err, resp, data) {
            if (err) {
                res.status(500).send(err);
            } else if (resp.statusCode !== 200) {
                res.status(resp.statusCode).send(data);
            } else {
                res.send(data);
            }
        });
    }

    RED.httpAdmin.get('/swagger-client/js/*', function (req, res) {
        var filename = path.join(__dirname, '../js', req.params[0]);
        sendFile(res, filename);
    });

    RED.httpAdmin.get('/swagger-client/proxy', function (req, res) {
        if (req.query && req.query.swaggerUrl) {
            var url = decodeURIComponent(req.query.swaggerUrl);
            proxySwaggerRequest(res, url);
        } else {
            res.status(400).send('Please pass a valid Swagger URL as a query param.');
        }
    });
};

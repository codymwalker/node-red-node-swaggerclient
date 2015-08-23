module.exports = function(RED) {
    
    "use strict";
    var path = require("path");
    var swaggerjs = require('swagger-client');
    
    function SwaggerClientNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        this.on('input', function(msg) {
            var url = config.url || msg.url;
            var api = config.api || msg.api;
            var resource = config.resource || msg.resource;
            var params = config.params || msg.params;
            
            if(! (url && api && resource)){
                node.error('Missing configuration values', msg);
                return;
            }
            
            console.log('url: ' + url);
            console.log('api: ' + api);
            console.log('resource: ' + resource);
            console.log('params: ' + JSON.stringify(params));
            
            if(params && params['_isModel']){
                for(var key in params){
                    if(key != '_isModel'){
                        try{
                            params = {
                                body: JSON.parse(params[key])
                            }
                        } catch(e){
                            node.error('Bad JSON in object: ' + key, msg);
                            return;
                        }
                        
                    }
                }
            }
            
            
            var client = new swaggerjs.SwaggerClient({
                url: url,
                success: function() {
                    client[api][resource](params, {responseContentType: 'application/json'}, function(resp){
                        msg.statusCode = resp.status;
                        msg.payload = resp.obj;
                        node.send(msg);
                        return;
                    }, function(err){
                        msg.statusCode = err.status;
                        msg.payload = err.obj;
                        node.send(msg);
                        return;
                    })
                },
                failure: function(err) {
                    node.error(err, msg);
                    return;
                }
            });
        });
    }
    
    RED.nodes.registerType("swagger client",SwaggerClientNode);
    
    RED.httpAdmin.get('/swagger-client/reqs/*', function(req, res){
        var filename = path.join(__dirname , '../node_modules/swagger-client/lib', req.params[0]);
        res.sendfile(filename);
    });
}
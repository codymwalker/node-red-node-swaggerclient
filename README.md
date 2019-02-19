node-red-node-swaggerclient
=====================

A Node-RED wrapper for the swagger-client package

Allows the user to point to an online Swagger definition. It will then parse the Swagger doc and present the available APIs. After selecting an API, the user can select a resource and supply the parameters. The supplied configuration options will be saved in the node, and will be executed when the node receives input.

Install
-------

Run the following command in your Node-RED user directory - typically `~/.node-red`

        npm install node-red-node-swaggerclient

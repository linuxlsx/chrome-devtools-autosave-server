'use strict';

var routes = [
    {
        from: /^file:\/\/(?:localhost)?\//,
        to: '/'
    }
];
var port = 9104;
var address = '127.0.0.1';

function start(routes, port, address) {

    var fs = require('fs');

    require('http').createServer(function(request, response) {

        if (request.headers['x-type'] == 'document') {
            internalServerError("Can’t add a new CSS rule. It is not yet supported.");
            return;
        }

        var url = request.headers['x-url'];

        if (!url) {
            internalServerError('X-URL header is missing');
            return;
        }

        var matches;
        for (var i = 0; i < routes.length; i++) {
            var route = routes[i];
            if (route.from.test(url)) {
                matches = true;
                break;
            }
        }

        if (!matches) {
            if (i === 1) {
                internalServerError('URL (' + url + ') doesn’t match RegExp ' + route.from);
            } else {
                internalServerError('URL (' + url + ') doesn’t match any of the following RegExps:\n' + routes.map(function(a) {
                    return a.from;
                }).join('\n'));
            }
            return;
        }

        var path = decodeURIComponent(url.replace(route.from, route.to));
        if (/\/[C-Z]:\//.test(path)) {
            // Oh, Windows.
            path = path.slice(1);
        }

        var chunks = [];
        request.on('data', function(chunk) {
            chunks.push(chunk);
        });

        request.on('end', function() {
            var stream = fs.createWriteStream(path);
            for (var i = 0; i < chunks.length; i++) {
                stream.write(chunks[i]);
            }
            stream.on('error', function(error) {
                console.error(error.message);
                internalServerError(error.message);
            });
            stream.on('close', function() {
                response.writeHead(200);
                response.end('OK\n');
                console.log('Saved a ' + request.headers['x-type'] + ' to ' + path);
            });
            stream.end();
        });

        function internalServerError(message) {
            response.writeHead(500);
            response.end(message);
        }

    }).listen(port, address);

    console.log('DevTools Autosave is listening on http://' + address + ':' + port);
}

if (module.parent) {
    // Loaded via module, i.e. require('index.js')
    exports.start = start;
    exports.routes = routes;
    exports.defaultPort = port;
    exports.defaultAddress = address;
} else {
    // Loaded directly, i.e. `node index.js`
    start(routes, port, address);
}

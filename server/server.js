require('gulp-babel/node_modules/babel-core/polyfill.js');
require('./imajs/shim.js');

var cluster = require('cluster');

var path = require('path');
global.appRoot = path.resolve(__dirname);
var favicon = require('serve-favicon');
var clientApp = require('./imajs/clientApp.js');
var proxy = require('./imajs/proxy.js');
var urlParser = require('./imajs/urlParser.js');
var bodyParser = require('body-parser');
var multer = require('multer')({dest: __dirname + '/static/uploads/'});
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var environment = require('./imajs/environment.js');
var compression = require('compression');
var helmet = require('helmet');

var cacheConfig = environment.$Server.cache;
var cache = new (require('./cache.js'))(cacheConfig);

process.on('uncaughtException', function(error) {
	console.error('Uncaught Exception:', error.message, error.stack);
});

var allowCrossDomain = (req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

	if (req.method === 'OPTIONS') {
		res.send();
	} else {
		next();
	}
};

var renderApp = (req, res) => {
	console.log('renderApp');
	if (req.method === 'GET') {
		console.log('can be cached');
		var cachedPage = cache.get(req);
		if (cachedPage) {
			console.log('cached');
			res.status(200);
			res.send(cachedPage);

			return;
		}
	}

	clientApp
		.requestHandler(req, res)
		.then((response) => {
			//console.log('RESOLVE', response = { status: number, content: string, SPA: boolean= });

			if ((req.method === 'GET') && (response.status === 200) && !response.SPA) {
				console.log('setting to cache');
				cache.set(req, response.content);
			}
		}, (error) => {
			//console.log('REJECT', error, error.stack);
		}).catch((error) => {
			console.error('Cache error', error);
		});
};

var errorHandler = (err, req, res, next) => {
	clientApp.errorHandler(err, req, res);
};

var staticErrorPage = (err, req, res, next) => {
	clientApp.showStaticErrorPage(err, req, res);
};

var runNodeApp = () => {
	var express = require('express');
	var app = express();

	app.set('trust proxy', true);

	app.use(helmet())
		.use(compression())
		.use(favicon(__dirname + '/static/img/favicon.ico'))
		.use(environment.$Server.staticFolder, express.static(path.join(__dirname, 'static')))
		.use(bodyParser.json()) // for parsing application/json
		.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
		.use(multer.array()) // for parsing multipart/form-data
		.use(cookieParser())
		.use(methodOverride())
		.use(environment.$Proxy.path + '/', proxy)
		.use(urlParser)
		.use(renderApp)
		.use(errorHandler)
		.use(staticErrorPage)
		.listen(environment.$Server.port, function() {
			return console.log('Point your browser at http://localhost:' + environment.$Server.port);
		});
};

if (environment.$Env === 'dev') {

	runNodeApp();

} else {

	if (cluster.isMaster) {

		var cpuCount = environment.$Server.clusters || require('os').cpus().length;

		// Create a worker for each CPU
		for (var i = 0; i < cpuCount; i += 1) {
			cluster.fork();
		}

		// Listen for dying workers
		cluster.on('exit', function (worker) {
			console.log('Worker ' + worker.id + ' died :(');
			cluster.fork();
		});

	} else {
		runNodeApp();
	}

}


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
var logger = require('./imajs/logger.js');

var cacheConfig = environment.$Server.cache;
var cache = new (require('./imajs/cache.js'))(cacheConfig);

process.on('uncaughtException', function (error) {
	logger.error('Uncaught Exception:', error.message, error.stack);
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
	if (req.method === 'GET') {
		var cachedPage = cache.get(req);
		if (cachedPage) {
			res.status(200);
			res.send(cachedPage);

			return;
		}
	}

	clientApp
		.requestHandler(req, res)
		.then((response) => {
			// logger.info('Request handled successfully', { response: { status: number, content: string, SPA: boolean=, error: Error= } });

			if (response.error) {
				logger.error('App error', {
					error: {
						type: response.error.name,
						message: response.error.message,
						stack: response.error.stack
					}
				});
			}

			if ((req.method === 'GET') && (response.status === 200) && !response.SPA && !response.error) {
				cache.set(req, response.content);
			}
		}, (error) => {
			// logger.error('REJECT', {
			// 	error: {
			// 		type: error.name,
			// 			message: error.message,
			// 			stack: error.stack
			// 	}
			// });
		})
		.catch((error) => {
			logger.error('Cache error', {
				error: {
					type: error.name,
					message: error.message,
					stack: error.stack
				}
			});
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
		.listen(environment.$Server.port, () => {
			return logger.info('Point your browser at http://localhost:' + environment.$Server.port);
		});
};

if (environment.$Env === 'dev' || environment.$Server.clusters === 1) {

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
			logger.warn('Worker ' + worker.id + ' died :(');
			cluster.fork();
		});

	} else {
		runNodeApp();
	}

}


/**
 * This is the initalization file for the ExpressMVC framework.
 */

(function () {
	var _			= require('uquery'),
		express		= require('express'),
		path		= require('path'),
		fs			= require('fs'),
		
		validator	= require('express-validator'),
		consolidate	= require('consolidate'),
		swig		= require('swig'),
		i18next		= require('i18next'),
		
		//This is the system library load loader.
		loader		= require('./loader'),
		CoreLib		= loader(),
		Config		= CoreLib('config'),

        /**
         * An object cache for the various loader functions.
         * @type {Object.<string,*>}
         */
        loader_cache    = {},

        /**
         * Set up the logger if configured
         * @param {Config} config
         * @return {log}
         */
		load_logger	= function (config) {
			var file	= config.getValue('log.file'),
				level	= config.getValue('log.level') || 'DEBUG',
				stream	= null,
				Log		= require('log');

			//only turn on logging if we have a configured file.
			if (file) {
				stream		= fs.createWriteStream(file, {
					flags: 'a+',
					encoding: 'utf8'
				});
			}
			return new Log(level, stream);
		},

        /**
         *  Load a given cache store
         * @param {string} name
         * @return {Object.<string,*>}
         */
        get_cache_store = function (name) {
            if (!loader_cache.hasOwnProperty(name)) {
                loader_cache[name]  = {};
            }
            return loader_cache[name];
        },

		/**
		 * Abstraction of the object loading.
		 * @param {string} name
		 * @param {string} base_dir
		 * @return {*}
		 */
		mvc_loader	= function (name, base_dir) {
			var object,
                object_path = path.join(path.normalize(base_dir), name),
                cache       = get_cache_store('mvc');

            //Let's cache our loaded objects.
            if (cache.hasOwnProperty(object_path)) {
                object      = cache[object_path];
			} else if (fs.existsSync(object_path + '.js')) {
				object      = require(object_path);
			} else {
				this.logger.notice("Unable to load MVC object: " + object_path);
			}

			if (object) {
				cache[object_path]	= object;
			}

            return object;
		},

		/**
		 * A private function to set up the MVC paths.
		 */
		setup_paths	= function() {
			/**
			 * This is the base path for your application.
			 * @var {string}
			 */
			this.application_path	= this.config.getValue('application.path');

			if (!this.application_path) {
				throw new Exception('You must set the application path.');
			}

			/**
			 * This is the setting for the plugin paths.
			 * @var {string}
			 */
			this.plugin_path		= this.config.getValue('application.plugin.path');

			if (!this.plugin_path) {
				this.plugin_path	= __dirname + '/plugins';
			}

			/**
			 * This is the setting for the library paths.
			 * @var {string}
			 */
			this.lib_path			= this.config.getValue('application.library.path');

			if (!this.library_path) {
				this.library_path	= __dirname + '/lib';
			}

			/**
			 * This is the setting for the controller path.
			 * @var {string}
			 */
			this.controller_path	= this.config.getValue('application.controller.path');

			if (!this.controller_path) {
				this.controller_path	= this.application_path + '/controllers';
			}

            /**
             * This is the setting for the model path.
             * @var {string}
             */
            this.model_path    = this.config.getValue('application.model.path');

            if (!this.model_path) {
                this.model_path         = this.application_path + '/models';
            }

			/**
			 * This is the setting for the view path.
			 * @var {string}
			 */
			this.view_path			= this.config.getValue('application.view.path');

			if (!this.view_path) {
				this.view_path			= this.application_path + '/views';
			}

			/**
			 * This is the setting for the i18n path.
			 * @var {string}
			 */
			this.i18n_path			= this.config.getValue('application.i18n.path');

			if (!this.i18n_path) {
				this.i18n_path		= this.application_path + '/i18n';
			}

			/**
			 * This is the setting for the static files path.
			 * @var {string}
			 */
			this.static_path		= this.config.getValue('application.static.path');
		};

	//required express plugins
	require('express-namespace');

	/**
	 * @param {string} config_path - the path for this application's
	 *				configuration files. Must be an absolute path.
	 * @param {string} config_file - config filename inside of config_path.
	 * @param {Function} callback - the function that will be run on application
	 *				initialization completion.
	 */
	function MVC(config_path, config_file, callback) {
		var config	= new Config();
		config.load(config_path, config_file, _.bind(this.init, this, callback));
	}
	/**
	 * This is the MVC framework initialization function.  This will be run
	 * immediately after the configuration has bee loaded.
	 * @param {Config} config
	 * @return {MVC}
	 */
	MVC.prototype.init	= function(callback, config) {
		/**
		 * @type {Config}
		 */
		this.config	= config;
		this.logger	= load_logger(config);
		this.loaders = {};
		var	lib_func	= _.bind(this.Library, this),
			server		= express.createServer(
				
			);
		this.server			= server;
		this.plugins		= [];
		this.controllers	= [];

		setup_paths.call(this);

		callback(this, server);
		return this;
	};

	MVC.prototype.run	= function () {
		var server	= this.server;

		server.configure(_.bind(function () {
			if (this.config.getValue('application.localize')) {
				i18next.init({
					lng: this.config.getValue('application.locale.default', 'en_US'),
					resGetPath: this.config.getValue('application.locale.path') ||
						this.application_path + '/i18n/__lng__/__ns__.json',
					resSetPath: this.config.getValue('application.locale.path') ||
						this.application_path + '/i18n/__lng__/__ns__.json',
					saveMissing: this.config.getValue('application.debug', false),
					ns: {
						namespaces: ['translation', 'link', 'url', 'company', 'form', 'error'],
						defaultNs: 'translation'
					}
				});
			}
			
			swig.init({
				root: this.view_path,
				allowErrors: true,
				cache: this.config.getValue('application.view.cache', true) === 'false' ? false : true,
				filters: require(__dirname + '/swig/custom_filters'),
				tags: require(__dirname + '/swig/custom_tags'),
				extensions: {
					i18next: i18next
				}
			});
			server.engine('.twig',consolidate.swig);
			server.set('view engine', 'twig');
			server.set('views', this.view_path);

			server.use(express.bodyParser());
			server.use(express.cookieParser());

			var session	= {
					"secret": this.config.sessionSecret || "All this crazy stuff"
				},
				redis	= this.config.getValue('application.session.redis'),
				RedisStore;

			if (redis) {
				this.logger.notice("Using redis based session storage");
				RedisStore	= require('connect-redis')(express);
				session.store	= new RedisStore({
					host: redis.host,
					port: redis.port,
					db: redis.db,
					pass: redis.password,
					prefix: redis.prefix
				});
			}
			server.use(express.session(session));


			this.plugins.forEach(function (plugin) {
				server.use(plugin());
			});
			server.use(validator);
			server.use(server.router);

			var error_handler_opts	= {};

			if (this.config.getValue('application.debug')) {
				error_handler_opts	= {dump: true, stack: true};
			}

			server.use(express.errorHandler(error_handler_opts));

			if (this.static_path) {
				server.use(express.static(this.static_path, { maxAge: 'oneYear' }));
			}

			this.controllers.forEach(function (controller) {
				controller();
			});
		}, this));
                
		var inputport = 0;
		process.argv.forEach(function (val, index, array) {
		if(val=='-p')
		{
			if(parseInt(process.argv[index+1]))
			{
				console.dir('Received -p port:'+process.argv[index+1]);
				inputport=parseInt(process.argv[index+1]);
			}
		}
		});

		var port	= inputport||this.config.getValue('application.listen');
		this.logger.info('Listening on port: ' + port);
		this.server.listen(port);
	};

	MVC.prototype.Controller	= function (name, load_immediately) {
        this.logger.notice(
            "Loading Controller: " + name + " (" +
            (load_immediately ? "immediate" : "deferred") + ")"
        );
		var controller	= mvc_loader.call(this, name, this.controller_path),
			args		= Array.prototype.slice.call(arguments, 1);
		args.unshift(this.server);
		args.unshift(this);

        if (load_immediately) {
            controller.apply(null, args);
        } else {
            this.controllers.push(function() {
                controller.apply(null, args);
            });
        }
		return this;
	};

    MVC.prototype.Model         = function (name) {
        var model	= mvc_loader.call(this, name, this.model_path);

        if (!model) {
			this.logger.warning("Unable to load model: " + name);
        }
        return model;
    };

	MVC.prototype.Plugin		= function (name) {
		var file		= this.config.getValue('application.plugin.file') || name,
			args		= Array.prototype.slice.call(arguments, 1),
			plugin;

			args.unshift(this.server);
			args.unshift(this);

		file	= name + '/' + file;
		plugin	= mvc_loader.call(this, file, this.plugin_path);

		if (!plugin) {
			this.logger.notice("Loading Application specific plugin: " + name);
			plugin	= mvc_loader.call(this, file, this.application_path + '/plugins');
		} else {
			this.logger.notice("Loaded ExpressMVC plugin: " + name);
		}

		if (plugin)	{
			plugin	= plugin.apply(null, args);
		}

		return plugin;
	};

	MVC.prototype.Middleware			= function (name) {
		var self	= this,
			args	= arguments;

		this.plugins.push(function () {
			return self.Plugin.apply(self, args);
		});
		return this;
	};

	MVC.prototype.addLibrary	= function (name, base_dir, main_file_name) {
		var lib_loader		= loader(base_dir, main_file_name);
		this.loaders[name]	= lib_loader;

		return lib_loader;
	};

	MVC.prototype.Library		= function (name, type) {
		var lib,
			args	= Array.prototype.slice.call(arguments, 2);

		args.unshift(name);

		if (!type) {
			lib	= CoreLib.apply(null, args);

		} else {
			lib	= this.loaders[type].apply(null, args);
		}

		return lib;
	};

	//Expose the model library
	MVC.Model	= CoreLib('model');

	//Expose the CoreLib loader
	MVC.CoreLib	= CoreLib;

	//Expose the uQuery library
	MVC.uquery	= _;

    //Allow loading of ExpressMVC node_modules.
    MVC.require = MVC.prototype.require = function (path) {
        return require(path);
    };

	//expose the MVC object
	module.exports	= MVC;
}());

// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
var _ = require('lodash');
var {TraceUtils} = require('@themost/common');
var {LangUtils} = require('@themost/common');
var {DataContext} = require('./types');
var {DataConfigurationStrategy} = require('./data-configuration');
var cfg = require('./data-configuration');
var Symbol = require('symbol');
var nameProperty = Symbol('name');
var { DataModel } = require('./data-model');

/**
 * @classdesc Represents the default data context of MOST Data Applications.
 * The default data context uses the adapter which is registered as the default adapter in application configuration.
 * @description
 ```
 adapters: [
 ...
 { "name":"development", "invariantName":"...", "default":false,
    "options": {
      "server":"localhost",
      "user":"user",
      "password":"password",
      "database":"test"
    }
},
 { "name":"development_with_pool", "invariantName":"pool", "default":true,
    "options": {
      "adapter":"development"
    }
}
 ...
 ]
 ```
 * @class
 * @constructor
 * @augments {DataContext}
 * @property {DataAdapter} db - Gets a data adapter based on the current configuration settings.
 */
function DefaultDataContext()
{
    DefaultDataContext.super_.bind(this)();
    /**
     * @type {import('./types').DataAdapter}
     */
    var _db= null;
    /**
     * @name DataAdapter#hasConfiguration
     * @type {Function}
     * @param {Function} getConfigurationFunc
     */
    /**
     * @private
     */
    this._finalize = function(cb) {
        if (_db) {
            return _db.close(function(err) {
                // destroy db context
                _db = null;
                return cb(err);
            });
        }
        return cb();
    };
    var self = this;
    // set data context name with respect to DataContext implementation
    var _name = 'default';
    Object.defineProperty(this, 'name', {
       enumerable: false,
       configurable: true,
        get: function() {
             return _name;
        }
    });

    self.getDb = function() {

        if (_db)
            return _db;
        var er;
        //otherwise load database options from configuration
        var strategy = self.getConfiguration().getStrategy(DataConfigurationStrategy);
        var adapter = _.find(strategy.adapters, function(x) {
            return x['default'];
        });
        if (_.isNil(adapter)) {
            er = new Error('The default data adapter is missing.'); er.code = 'EADAPTER';
            throw er;
        }
        /**
         * @type {*}
         */
        var adapterType = strategy.adapterTypes.get(adapter.invariantName);
        //validate data adapter type
        if (adapterType == null) {
            er = new Error('Invalid adapter type.'); er.code = 'ERR_ADAPTER_TYPE';
            throw er;
        }
        // get data adapter instance
        var createInstance = adapterType.createInstance;
        // get adapter type constructor if any
        var AdapterTypeCtor = adapterType.type;
        // create adapter instance
        if (typeof  AdapterTypeCtor === 'function') {
            _db = new AdapterTypeCtor(adapter.options);
        } else if (typeof createInstance === 'function') {
            _db = createInstance(adapter.options);
        } else {
            // throw error
            var err = new Error('The given adapter type is invalid. Adapter type constructor is undefined.');
            err.code = 'ERR_ADAPTER_TYPE';
            throw err;
        }
        if (typeof _db.hasConfiguration === 'function') {
            _db.hasConfiguration(function() {
               return self.getConfiguration();
            });
        }
        return _db;
    };

    self.setDb = function(value) {
        /**
         * @type {DataAdapter|*}
         */
        _db = value;
        if (_db) {
            if (typeof _db.hasConfiguration === 'function') {
                _db.hasConfiguration(function() {
                    return self.getConfiguration();
                });
            }
        }
    };

    delete self.db;

    Object.defineProperty(self, 'db', {
        get: function() {
            return self.getDb();
        },
        set: function(value) {
            self.setDb(value);
        },
        configurable: true,
        enumerable:false
    });
        
}

LangUtils.inherits(DefaultDataContext, DataContext);

/**
 * Gets an instance of DataConfiguration class which is associated with this data context
 * @returns {import('@themost/common').ConfigurationBase}
 */
DefaultDataContext.prototype.getConfiguration = function() {
    return cfg.getCurrent();
};

/**
 * Gets an instance of DataModel class based on the given name.
 * @param {*} name - A variable that represents the model name.
 * @returns {DataModel} - An instance of DataModel class associated with this data context.
 */
DefaultDataContext.prototype.model = function(name) {
    var self = this;
    if (name == null) {
        return null;
    }
    var modelName = name; 
    // if model is a function (is a constructor)
    if (typeof name === 'function') {
        // try to get EdmMapping.entityType() decorator
        if (Object.prototype.hasOwnProperty.call(name, 'entityTypeDecorator')) {
            // if entityTypeDecorator is string
            if (typeof name.entityTypeDecorator === 'string') {
                // get model name
                modelName = name.entityTypeDecorator;
            }
        } else {
            // get function name as the requested model
            modelName = name.name;
        }
    }
    var obj = self.getConfiguration().getStrategy(DataConfigurationStrategy).model(modelName);
    if (_.isNil(obj))
        return null;
    var model = new DataModel(obj);
    //set model context
    model.context = self;
    //return model
    return model;
};
/**
 * Finalizes the current data context
 * @param {Function} cb - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 */
DefaultDataContext.prototype.finalize = function(cb) {
    cb = cb || function () {};
    void this._finalize(function(err) {
        if (err) {
            TraceUtils.error('An error occurred while finalizing the underlying database context.');
            TraceUtils.error(err);
        }
        return cb();
    });
};


/**
 * @classdesc Represents a data context based on a data adapter's name.
 * The specified adapter name must be registered in application configuration.
 * @class
 * @constructor
 * @augments DataContext
 * @property {DataAdapter} db - Gets a data adapter based on the given adapter's name.
 */
function NamedDataContext(name)
{
    NamedDataContext.super_.bind(this)();
    /**
     * @type {DataAdapter}
     * @private
     */
    var _db;
    /**
     * @private
     */
    this._finalize = function(cb) {
        if (_db) {
            return _db.close(function(err) {
                // destroy db context
                _db = null;
                return cb(err);
            });
        }
        return cb();
    };
    var self = this;
    self[nameProperty] = name;

    self.getDb = function() {
        if (_db)
            return _db;
        var strategy = self.getConfiguration().getStrategy(DataConfigurationStrategy);
        //otherwise load database options from configuration
        var adapter = strategy.adapters.find(function(x) {
            return x.name === self[nameProperty];
        });
        var er;
        if (typeof adapter ==='undefined' || adapter===null) {
            er = new Error('The specified data adapter is missing.'); er.code = 'EADAPTER';
            throw er;
        }
        //get data adapter type
        var adapterType = strategy.adapterTypes.get(adapter.invariantName);
        // get data adapter instance
        var createInstance = adapterType.createInstance;
        // get adapter type constructor if any
        var AdapterTypeCtor = adapterType.type;
        // create adapter instance
        if (typeof  AdapterTypeCtor === 'function') {
            _db = new AdapterTypeCtor(adapter.options);
        } else if (typeof createInstance === 'function') {
            _db = createInstance(adapter.options);
        } else {
            // throw error
            var err = new Error('The given adapter type is invalid. Adapter type constructor is undefined.');
            err.code = 'ERR_ADAPTER_TYPE';
            throw err;
        }
        if (typeof _db.hasConfiguration === 'function') {
            _db.hasConfiguration(function() {
                return self.getConfiguration();
            });
        }
        return _db;
    };

    /**
     * @param {DataAdapter|*} value
     */
    self.setDb = function(value) {
        _db = value;
        if (_db) {
            if (typeof _db.hasConfiguration === 'function') {
                _db.hasConfiguration(function() {
                    return self.getConfiguration();
                });
            }
        }

    };

    /**
     * @name NamedDataContext#db
     * @type {DataAdapter}
     */

    Object.defineProperty(self, 'db', {
        get : function() {
            return self.getDb();
        },
        set : function(value) {
            self.setDb(value);
        },
        configurable : true,
        enumerable:false });

    /**
     * @name NamedDataContext#name
     * @type {string}
     */
    Object.defineProperty(self, 'name', {
        get: function () {
            return self[nameProperty];
        }
    });

}
LangUtils.inherits(NamedDataContext, DataContext);

/**
 * Gets a string which represents the name of this context
 * @returns {string}
 */
NamedDataContext.prototype.getName = function() {
    return this[nameProperty];
};

/**
 * Gets an instance of DataConfiguration class which is associated with this data context
 * @returns {DataConfiguration}
 */
NamedDataContext.prototype.getConfiguration = function() {
    return cfg.getNamedConfiguration(this.name);
};
/**
 * Gets an instance of DataModel class based on the given name.
 * @param name {string} - A string that represents the model name.
 * @returns {DataModel} - An instance of DataModel class associated with this data context.
 */
NamedDataContext.prototype.model = function(name) {
    var self = this;
    if (name == null) {
        return null;
    }
    var modelName = name; 
    // if model is a function (is a constructor)
    if (typeof name === 'function') {
        // try to get EdmMapping.entityType() decorator
        if (Object.prototype.hasOwnProperty.call(name, 'entityTypeDecorator')) {
            // if entityTypeDecorator is string
            if (typeof name.entityTypeDecorator === 'string') {
                // get model name
                modelName = name.entityTypeDecorator;
            }
        } else {
            // get function name as the requested model
            modelName = name.name;
        }
    }
    var obj = self.getConfiguration().getStrategy(DataConfigurationStrategy).model(modelName);
    if (_.isNil(obj))
        return null;
    var model = new DataModel(obj);
    //set model context
    model.context = self;
    //return model
    return model;

};

NamedDataContext.prototype.finalize = function(cb) {
    cb = cb || function () {};
    this._finalize(function(err) {
        if (err) {
            TraceUtils.error('An error occurred while finalizing the underlying database context.');
            TraceUtils.error(err);
        }
        cb();
    });
};

module.exports = {
    DefaultDataContext,
    NamedDataContext
}

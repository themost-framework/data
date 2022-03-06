// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
const {DataContext} = require('./types');
const {DataConfigurationStrategy} = require('./data-configuration');
const cfg = require('./data-configuration');
const Symbol = require('symbol');
const nameProperty = Symbol('name');

/**
 * @class
 * @property {DataAdapter} db - Gets a data adapter based on the current configuration settings.
 */
class DefaultDataContext extends DataContext {
    constructor() {
        super();
        Object.defineProperty(this, '_db', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: null
        });
        /**
         * @name DataAdapter#hasConfiguration
         * @type {Function}
         * @param {Function} getConfigurationFunc
         */
        var self = this;
        var _name = 'default';
        Object.defineProperty(self, 'name', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: _name
        });

        Object.defineProperty(self, 'db', {
            get: function () {
                return self.getDb();
            },
            set: function (value) {
                self.setDb(value);
            },
            configurable: true,
            enumerable: false
        });
    }

    /**
     * 
     * @returns {DataAdapter}
     */
    getDb() {
        const self = this;
        if (self._db) {
            return self._db;
        }
        var er;
        //otherwise load database options from configuration
        var strategy = self.getConfiguration().getStrategy(DataConfigurationStrategy);
        var adapter = strategy.adapters.find(function (x) {
            return x['default'];
        });
        if (adapter == null) {
            er = new Error('The default data adapter is missing.'); er.code = 'EADAPTER';
            throw er;
        }
        /**
         * @type {*}
         */
        var adapterType = strategy.adapterTypes[adapter.invariantName];
        //validate data adapter type
        if (adapterType == null) {
            er = new Error('Invalid adapter type.'); er.code = 'EADAPTER';
            throw er;
        }
        if (typeof adapterType.createInstance !== 'function') {
            er = new Error('Invalid adapter type. Adapter initialization method is missing.'); er.code = 'EADAPTER';
            throw er;
        }
        //otherwise load adapter
        /**
         * @type {DataAdapter|*}
         */
         self._db = adapterType.createInstance(adapter.options);
        if (typeof self._db.hasConfiguration === 'function') {
            self._db.hasConfiguration(function () {
                return self.getConfiguration();
            });
        }
        return self._db;
    }

    /**
     * 
     * @param {DataAdapter} value 
     */
    setDb(value) {
        const self = this;
        self._db = value;
        if (self._db) {
            if (typeof self._db.hasConfiguration === 'function') {
                self._db.hasConfiguration(function () {
                    return self.getConfiguration();
                });
            }
        }
    }

    /**
     * Gets an instance of DataConfiguration class which is associated with this data context
     * @returns {ConfigurationBase|*}
     */
    getConfiguration() {
        return cfg.getCurrent();
    }
    /**
     * Gets an instance of DataModel class based on the given name.
     * @param {*} name - A variable that represents the model name.
     * @returns {DataModel} - An instance of DataModel class associated with this data context.
     */
    model(name) {
        const self = this;
        if (name == null) {
            return null;
        }
        let modelName = name;
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
        const obj = self.getConfiguration().getStrategy(DataConfigurationStrategy).model(modelName);
        if (obj == null) {
            return null;
        }
        const {DataModel} = require('./data-model');
        const model = new DataModel(obj);
        //set model context
        model.context = self;
        //return model
        return model;
    }

    /**
     * Finalizes data context
     * @param {function} callback 
     * @returns {void}
     */
    finalize(callback) {
        const self = this;
        if (self._db != null) {
            return self._db.close(function(err) {
                if (err == null) {
                    self._db = null;
                } 
                return callback(err);
            })
        }
        return callback();
    }
}

/**
 * @classdesc Represents a data context based on a data adapter's name.
 * The specified adapter name must be registered in application configuration.
 * @class
 * @constructor
 * @augments DataContext
 * @property {DataAdapter} db - Gets a data adapter based on the given adapter's name.
 */
class NamedDataContext extends DataContext {
    constructor(name) {
        super();
        Object.defineProperty(this, '_db', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: null
        });
        var self = this;
        Object.defineProperty(self, 'db', {
            get: function () {
                return self.getDb();
            },
            set: function (value) {
                self.setDb(value);
            },
            configurable: true,
            enumerable: false
        });
        Object.defineProperty(self, 'name', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: name
        });

    }

    getDb() {
        const self = this;
        if (self._db) {
            return self._db;
        }
        var strategy = self.getConfiguration().getStrategy(DataConfigurationStrategy);
        //otherwise load database options from configuration
        var adapter = strategy.adapters.find(function (x) {
            return x.name === self.name;
        });
        var er;
        if (typeof adapter === 'undefined' || adapter === null) {
            er = new Error('The specified data adapter is missing.'); er.code = 'EADAPTER';
            throw er;
        }
        //get data adapter type
        var adapterType = strategy.adapterTypes[adapter.invariantName];
        //validate data adapter type
        if (adapterType == null) {
            er = new Error('Invalid adapter type.'); er.code = 'EADAPTER';
            throw er;
        }
        if (typeof adapterType.createInstance !== 'function') {
            er = new Error('Invalid adapter type. Adapter initialization method is missing.'); er.code = 'EADAPTER';
            throw er;
        }
        //otherwise load adapter
        self._db = adapterType.createInstance(adapter.options);
        if (typeof self._db.hasConfiguration === 'function') {
            self._db.hasConfiguration(function () {
                return self.getConfiguration();
            });
        }
        return self._db;
    }

    setDb(value) {
        const self = this;
        self._db = value;
        if (self._db) {
            if (typeof self._db.hasConfiguration === 'function') {
                self._db.hasConfiguration(function () {
                    return self.getConfiguration();
                });
            }
        }
    }

    /**
     * Gets a string which represents the name of this context
     * @returns {string}
     */
    getName() {
        return this[nameProperty];
    }
    /**
     * Gets an instance of DataConfiguration class which is associated with this data context
     * @returns {DataConfiguration}
     */
    getConfiguration() {
        return cfg.getNamedConfiguration(this.name);
    }
    /**
     * Gets an instance of DataModel class based on the given name.
     * @param {*} name - A string that represents the model name.
     * @returns {DataModel} - An instance of DataModel class associated with this data context.
     */
    model(name) {
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
        if (obj == null) {
            return null;
        }
        var DataModel = require('./data-model').DataModel;
        var model = new DataModel(obj);
        //set model context
        model.context = self;
        //return model
        return model;
    }
    
    /**
     * Finalizes data context
     * @param {function} callback 
     * @returns {void}
     */
     finalize(callback) {
        const self = this;
        if (self._db != null) {
            return self._db.close(function(err) {
                if (err == null) {
                    self._db = null;
                } 
                return callback(err);
            })
        }
        return callback();
    }
}


module.exports = {
    DefaultDataContext,
    NamedDataContext
}
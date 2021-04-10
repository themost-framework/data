// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved
const { TraceUtils } = require('@themost/common');
const { DataContext } = require('./types');
const {DataConfigurationStrategy, DataConfiguration} = require('./data-configuration');

// noinspection JSValidateJSDoc
/**
 * @classdesc Represents the default data context of MOST Data Applications.
 * The default data context uses the adapter which is registered as the default adapter in application configuration.
 * @class
 * @constructor
 * @augments {DataContext}
 * @property {DataAdapter} db - Gets a data adapter based on the current configuration settings.
 */
class DefaultDataContext extends DataContext {
    constructor() {
        super();
        /**
         * @type {DataAdapter|*}
         */
        let _db = null;
        /**
         * @name DataAdapter#hasConfiguration
         * @type {Function}
         * @param {Function} getConfigurationFunc
         */
        /**
         * @private
         */
        this._finalize = function () {
            if (_db) {
                _db.close();
            }
            _db = null;
        };
        let self = this;
        // set data context name with respect to DataContext implementation
        let _name = 'default';
        Object.defineProperty(this, 'name', {
            enumerable: false,
            configurable: true,
            get: function () {
                return _name;
            }
        });

        self.getDb = function () {

            if (_db) {
                return _db;
            }
            let er;
            //otherwise load database options from configuration
            let strategy = self.getConfiguration().getStrategy(DataConfigurationStrategy);
            let adapter = strategy.adapters.find(function (x) {
                return x['default'];
            });
            if (adapter == null) {
                er = new Error('The default data adapter is missing.'); er.code = 'EADAPTER';
                throw er;
            }
            /**
             * @type {*}
             */
            let adapterType = strategy.adapterTypes[adapter.invariantName];
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
            _db = adapterType.createInstance(adapter.options);
            if (typeof _db.hasConfiguration === 'function') {
                _db.hasConfiguration(function () {
                    return self.getConfiguration();
                });
            }
            return _db;
        };

        self.setDb = function (value) {
            /**
             * @type {DataAdapter|*}
             */
            _db = value;
            if (_db) {
                if (typeof _db.hasConfiguration === 'function') {
                    _db.hasConfiguration(function () {
                        return self.getConfiguration();
                    });
                }
            }
        };

        delete self.db;

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
     * Gets an instance of DataConfiguration class which is associated with this data context
     * @returns {ConfigurationBase|*}
     */
    getConfiguration() {
        return DataConfiguration.getCurrent();
    }
    /**
     * Gets an instance of DataModel class based on the given name.
     * @param {*} name - A variable that represents the model name.
     * @returns {DataModel} - An instance of DataModel class associated with this data context.
     */
    model(name) {
        let self = this;
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
        let obj = self.getConfiguration().getStrategy(DataConfigurationStrategy).model(modelName);
        if (obj == null) {
            return null;
        }
        let DataModel = require('./data-model').DataModel,
            model = new DataModel(obj);
        //set model context
        model.context = self;
        //return model
        return model;
    }
    /**
     * Finalizes the current data context
     * @param {Function} cb - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     */
    finalize(cb) {
        cb = cb || function () { };
        this._finalize();
        cb();
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
        /**
         * @type {DataAdapter}
         * @private
         */
        let _db;
        /**
         * @private
         */
        this._finalize = function () {
            try {
                if (_db) {
                    _db.close();
                }
            } catch (err) {
                TraceUtils.debug('An error occurred while closing the underlying database context.');
                TraceUtils.debug(err);
            }
            _db = null;
        };
        let self = this;

        self.getDb = function () {
            if (_db) {
                return _db;
            }
            let strategy = self.getConfiguration().getStrategy(DataConfigurationStrategy);
            //otherwise load database options from configuration
            let adapter = strategy.adapters.find(function (x) {
                return x.name === self.name;
            });
            let er;
            if (typeof adapter === 'undefined' || adapter === null) {
                er = new Error('The specified data adapter is missing.');
                er.code = 'EADAPTER';
                throw er;
            }
            //get data adapter type
            let adapterType = strategy.adapterTypes[adapter.invariantName];
            //validate data adapter type
            if (adapterType == null) {
                er = new Error('Invalid adapter type.'); 
                er.code = 'EADAPTER';
                throw er;
            }
            if (typeof adapterType.createInstance !== 'function') {
                er = new Error('Invalid adapter type. Adapter initialization method is missing.');
                er.code = 'EADAPTER';
                throw er;
            }
            //otherwise load adapter
            _db = adapterType.createInstance(adapter.options);
            if (typeof _db.hasConfiguration === 'function') {
                _db.hasConfiguration(function () {
                    return self.getConfiguration();
                });
            }
            return _db;
        };

        /**
         * @param {DataAdapter|*} value
         */
        self.setDb = function (value) {
            _db = value;
            if (_db) {
                if (typeof _db.hasConfiguration === 'function') {
                    _db.hasConfiguration(function () {
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
            get: function () {
                return self.getDb();
            },
            set: function (value) {
                self.setDb(value);
            },
            configurable: true,
            enumerable: false
        });

        /**
         * @name NamedDataContext#name
         * @type {string}
         */
        Object.defineProperty(self, 'name', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: name
        });

    }
    /**
     * Gets a string which represents the name of this context
     * @returns {string}
     */
    getName() {
        return this.name;
    }
    /**
     * Gets an instance of DataConfiguration class which is associated with this data context
     * @returns {DataConfiguration}
     */
    getConfiguration() {
        return DataConfiguration.getNamedConfiguration(this.name);
    }
    /**
     * Gets an instance of DataModel class based on the given name.
     * @param name {string} - A string that represents the model name.
     * @returns {DataModel} - An instance of DataModel class associated with this data context.
     */
    model(name) {
        let self = this;
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
        let obj = self.getConfiguration().getStrategy(DataConfigurationStrategy).model(modelName);
        if (obj == null) {
            return null;
        }
        let DataModel = require('./data-model').DataModel;
        let model = new DataModel(obj);
        //set model context
        model.context = self;
        //return model
        return model;

    }
    finalize(cb) {
        cb = cb || function () { };
        this._finalize();
        cb.call(this);
    }
}

module.exports = {
    DefaultDataContext,
    NamedDataContext
}


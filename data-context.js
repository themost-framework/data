// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const {DataContext} = require('./types');
const {DataConfigurationStrategy, DataConfiguration} = require('./data-configuration');
const Symbol = require('symbol');
// eslint-disable-next-line no-unused-vars
const { DataAdapter } = require("./types");
const nameProperty = Symbol('name');

class DataAdapterError extends Error {
    constructor(msg) {
        super(msg);
        Object.assign(this, {
            code: 'ERR_DATA_ADAPTER'
        });
    } 
}

/**
 * @classdesc Represents the default data context of MOST Data Applications.
 * @property {DataAdapter} db - Gets a data adapter based on the current configuration settings.
 */
class DefaultDataContext extends DataContext {

    constructor() {
        super();
        // set default name property
        this[nameProperty] = 'default';
        Object.defineProperty(this, '_db', {
            configurable: false,
            enumerable: false,
            writable: true,
            value: null
        });
    }

    /**
     * @return {DataAdapter}
     */
    getDb() {
        if (this._db != null) {
            return this._db;
        }
        //otherwise load database options from configuration
        let strategy = this.getConfiguration().getStrategy(DataConfigurationStrategy);
        /**
         * @type {DataAdapter}
         */
        let adapter = strategy.adapters.find(function (item) {
            return item.default === true;
        });
        if (adapter == null) {
            throw new DataAdapterError('The default data adapter is missing.');
        }
        /**
         * @type {*}
         */
        let adapterType = strategy.adapterTypes[adapter.invariantName];
        //validate data adapter type
        if (adapterType == null) {
            throw new DataAdapterError('Invalid adapter type.')
        }
        if (typeof adapterType.createInstance !== 'function') {
            throw new DataAdapterError('Invalid adapter type. Adapter initialization method is missing.');
        }
        //otherwise load adapter
        /**
         * @type {DataAdapter|*}
         */
        this._db = adapterType.createInstance(adapter.options);
        if (typeof this._db.hasConfiguration === 'function') {
            const self = this;
            this._db.hasConfiguration(function () {
                return self.getConfiguration();
            });
        }
        return this._db;
    }

    /**
     * @param {DataAdapter|*} value
     * @returns {void}
     */
    setDb(value) {
        const self = this;
        this._db = value;
        if (this._db != null) {
            if (typeof this._db.hasConfiguration === 'function') {
                this._db.hasConfiguration(function () {
                    return self.getConfiguration();
                });
            }
        }
    }

    get name() {
        return this[nameProperty];
    }

    finalize(callback) {
        const self = this;
        callback = callback || function() {};
        if (self._db != null) {
            return self._db.close(function() {
                self._db = null;
                return callback();
            });
        }
        return callback();
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
        const DataModel = require('./data-model').DataModel;
        const model = new DataModel(obj);
        //set model context
        model.context = self;
        //return model
        return model;
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
class NamedDataContext extends DefaultDataContext {
    constructor(name) {
        super();
        this[nameProperty] = name;
    }

    getDb() {
        const self = this;
        if (this._db) {
            return this._db;
        }
        let strategy = this.getConfiguration().getStrategy(DataConfigurationStrategy);
        //otherwise load database options from configuration
        let adapter = strategy.adapters.find(function (x) {
            return x.name === self.name;
        });
        if (adapter == null) {
            throw new DataAdapterError('The default data adapter is missing.');
        }
        //get data adapter type
        let adapterType = strategy.adapterTypes[adapter.invariantName];
        //validate data adapter type
        if (adapterType == null) {
            throw new DataAdapterError('Invalid adapter type.')
        }
        if (typeof adapterType.createInstance !== 'function') {
            throw new DataAdapterError('Invalid adapter type. Adapter initialization method is missing.');
        }
        //otherwise, load adapter
        this._db = adapterType.createInstance(adapter.options);
        if (typeof this._db.hasConfiguration === 'function') {
            this._db.hasConfiguration(function () {
                return self.getConfiguration();
            });
        }
        return this._db;
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
        return DataConfiguration.getNamedConfiguration(this.name);
    }
}

module.exports = {
    DefaultDataContext,
    NamedDataContext
}


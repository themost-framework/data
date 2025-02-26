// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
/*eslint no-var: "error"*/
const {DataError} = require('@themost/common');
const {DataContext} = require('./types');
const {DataConfigurationStrategy} = require('./data-configuration');
const cfg = require('./data-configuration');
const { DataModel } = require('./data-model');
const { shareReplay, Observable } = require('rxjs');

class DefaultDataContext extends DataContext {
    constructor() {
        super();
        Object.defineProperty(this, '_db', {
            writable: true,
            enumerable: false,
            configurable: true,
            value: null
        });
        Object.defineProperty(this, 'name', {
            writable: true,
            enumerable: false,
            configurable: true,
            value: 'default'
        });

        this.user$ = new Observable((observer) => {
            void this.model('User').where(
                (x, name) => x.name === name, this.user && this.user.name
            ).expand((x) => x.groups).getItem().then((result) => observer.next(result)).catch((err) => observer.error(err));
        }).pipe(shareReplay());

        this.interactiveUser$ = new Observable((observer) => {
            void this.model('User').where(
                (x, name) => x.name === name, this.interactiveUser && this.interactiveUser.name
            ).expand((x) => x.groups).getItem().then((result) => observer.next(result)).catch((err) => observer.error(err));
        }).pipe(shareReplay());

    }

    /**
     * Gets the current data adapter instance
     * @returns {import('@themost/common').DataAdapterBase}
     */
    get db() {
        if (this._db) {
            return this._db;
        }
        // otherwise, load database options from configuration
        const strategy = this.getConfiguration().getStrategy(DataConfigurationStrategy);
        const adapter = strategy.adapters.find((x) => {
            return x.default === true;
        });
        if (adapter == null) {
            throw new DataError('ERR_ADAPTER', 'The default data adapter is missing.');
        }
        /**
         * @type {*}
         */
        const adapterType = strategy.adapterTypes.get(adapter.invariantName);
        //validate data adapter type
        if (adapterType == null) {
            throw new DataError('ERR_ADAPTER_TYPE', 'Invalid adapter type.');
        }
        // get data adapter instance
        const createInstance = adapterType.createInstance;
        // get adapter type constructor if any
        const AdapterTypeCtor = adapterType.type;
        // create adapter instance
        if (typeof AdapterTypeCtor === 'function') {
            this._db = new AdapterTypeCtor(adapter.options);
        } else if (typeof createInstance === 'function') {
            this._db = createInstance(adapter.options);
        } else {
            // throw error
            throw new DataError('ERR_ADAPTER_TYPE', 'The given adapter type is invalid. Adapter type constructor is undefined.');
        }
        if (typeof this._db.hasConfiguration === 'function') {
            this._db.hasConfiguration(() => {
                return this.getConfiguration();
            });
        }
        return this._db;
    }

    /**
     * Sets a data adapter instance
     * @param {import('@themost/common').DataAdapterBase} value
     */
    set db(value) {
        this._db = value;
        if (this._db) {
            if (typeof this._db.hasConfiguration === 'function') {
                this._db.hasConfiguration(() => {
                    return this.getConfiguration();
                });
            }
        }
    }

    /**
     * Gets an instance of DataConfiguration class which is associated with this data context
     * @returns {import('@themost/common').ConfigurationBase}
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
        const obj = this.getConfiguration().getStrategy(DataConfigurationStrategy).model(modelName);
        if (obj == null)
            return null;
        const model = new DataModel(obj);
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
        if (this._db) {
            return this._db.close((err) => {
                this._db = null;
                return cb(err);
            });
        }
        return cb();
    }

    /**
     * Gets the current user
     * @returns {import('rxjs').Observable<any}>}
     */
    getUser() {
        return this.user$;
    }
    /**
     * Gets the interactive user
     * @returns {import('rxjs').Observable<any>}
     */
    getInteractiveUser() {
        return this.interactiveUser$;
    }
}

class NamedDataContext extends DataContext {
    /**
     * @type {string} name
     */
    constructor(name) {

        super();

        Object.defineProperty(this, '_db', {
            writable: true,
            enumerable: false,
            configurable: true,
            value: null
        });

        Object.defineProperty(this, 'name', {
            writable: false,
            enumerable: false,
            configurable: true,
            value: name
        });

        this.user$ = new Observable((observer) => {
            void this.model('User').where(
                (x, name) => x.name === name, this.user && this.user.name
            ).expand((x) => x.groups).getItem().then((result) => observer.next(result)).catch((err) => observer.error(err));
        }).pipe(shareReplay(1));

        this.interactiveUser$ = new Observable((observer) => {
            void this.model('User').where(
                (x, name) => x.name === name, this.interactiveUser && this.interactiveUser.name
            ).expand((x) => x.groups).getItem().then((result) => observer.next(result)).catch((err) => observer.error(err));
        }).pipe(shareReplay(1));

    }

    get db() {
        if (this._db) {
            return this._db;
        }
        const strategy = this.getConfiguration().getStrategy(DataConfigurationStrategy);
        //otherwise load database options from configuration
        const adapter = strategy.adapters.find((x) => {
            return x.name === this.name;
        });
        if (adapter == null) {
            throw new DataError('ERR_ADAPTER', 'The specified data adapter is missing.');
        }
        //get data adapter type
        const adapterType = strategy.adapterTypes.get(adapter.invariantName);
        // get data adapter instance
        const createInstance = adapterType.createInstance;
        // get adapter type constructor if any
        const AdapterTypeCtor = adapterType.type;
        // create adapter instance
        if (typeof AdapterTypeCtor === 'function') {
            this._db = new AdapterTypeCtor(adapter.options);
        } else if (typeof createInstance === 'function') {
            this._db = createInstance(adapter.options);
        } else {
            // throw error
            throw new DataError('ERR_ADAPTER_TYPE', 'The given adapter type is invalid. Adapter type constructor is undefined.');
        }
        if (typeof this._db.hasConfiguration === 'function') {
            this._db.hasConfiguration(() => {
                return this.getConfiguration();
            });
        }
        return this._db;
    }

    set db(value) {
        this._db = value;
        if (this._db) {
            if (typeof this._db.hasConfiguration === 'function') {
                this._db.hasConfiguration(() => {
                    return this.getConfiguration();
                });
            }
        }
    }

    /**
     * Gets the current user
     * @returns {import('rxjs').Observable<{id: string, name: string, groups: Array<{id: string, name: string}>}>}
     */
    getUser() {
        return this.user$;
    }
    /**
     * Gets the interactive user
     * @returns {import('rxjs').Observable<{id: string, name: string, groups: Array<{id: string, name: string}>}>}
     */
    getInteractiveUser() {
        return this.interactiveUser$;
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
        return cfg.getNamedConfiguration(this.name);
    }
    /**
     * Gets an instance of DataModel class based on the given name.
     * @param name {string} - A string that represents the model name.
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
        const obj = this.getConfiguration().getStrategy(DataConfigurationStrategy).model(modelName);
        if (obj == null)
            return null;
        const model = new DataModel(obj);
        //set model context
        model.context = self;
        //return model
        return model;

    }


    finalize(cb) {
        cb = cb || function () { };
        if (this._db) {
            return this._db.close((err) => {
                this._db = null;
                return cb(err);
            });
        }
        return cb();
    }
}

module.exports = {
    DefaultDataContext,
    NamedDataContext
}

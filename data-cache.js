// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const {LangUtils, Args, SequentialEventEmitter, AbstractMethodError, ConfigurationStrategy} = require('@themost/common')
const {hasOwnProperty} = require('./has-own-property');
const currentProperty = Symbol('current');
const CACHE_ABSOLUTE_EXPIRATION = 1200;

/**
 * @classdesc Implements data cache mechanisms in MOST Data Applications.
 * DataCache class is used as the internal data caching engine, if any other caching mechanism is not defined.
 * @property {Number} ttl - An amount of time in seconds which is the default cached item lifetime.
 * @augments SequentialEventEmitter
 * @deprecated
 */
class DataCache extends SequentialEventEmitter {
    constructor() {
        super();
        // noinspection JSUnusedGlobalSymbols
        this.initialized = false;
    }
    /**
     * Initializes data caching.
     * @param {Function} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     *
     * @example
     var d = require("most-data");
     //try to find article with id 100 in cache
     d.cache.current.init(function(err) {
        done(err);
     };
     */
    init(callback) {
        try {
            if (this.initialized) {
                callback();
                return;
            }
            let NodeCache = require('node-cache');
            this.rawCache = new NodeCache();
            this.initialized = true;
            callback();
        } catch (e) {
            callback(e);
        }
    }
    /**
     * Removes a cached value.
     * @param {string} key - A string that represents the key of the cached value
     * @param {function(Error=)=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     */
    remove(key, callback) {
        let self = this;
        callback = callback || function () { };
        self.init(function (err) {
            if (err) {
                callback(err);
            } else {
                self.rawCache.set(key, callback);
            }
        });
    }
    /**
     * Flush all cached data.
     * @param {function(Error=)=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     *
     */
    removeAll(callback) {
        let self = this;
        callback = callback || function () { };
        self.init(function (err) {
            if (err) {
                callback(err);
            } else {
                self.rawCache.flushAll();
                callback();
            }
        });
    }
    /**
     * Sets a key value pair in cache.
     * @param {string} key - A string that represents the key of the cached value
     * @param {*} value - The value to be cached
     * @param {number=} ttl - A TTL in seconds. This parameter is optional.
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred and the second argument will return true on success.
     */
    add(key, value, ttl, callback) {
        let self = this;
        callback = callback || function () { };
        self.init(function (err) {
            if (err) {
                callback(err);
            } else {
                self.rawCache.set(key, value, ttl, callback);
            }
        });
    }
    /**
     * Gets data from cache or executes the defined function and adds the result to the cache with the specified key
     * @param {string|*} key - A string that represents the of the cached data
     * @param {function(function(Error=,*=))} fn - A function to execute if data will not be found in cache
     * @param {function(Error=,*=)} callback - A callback function where the first argument will contain the Error object if an error occurred and the second argument will contain the result.
     */
    ensure(key, fn, callback) {
        let self = this;
        callback = callback || function () { };
        if (typeof fn !== 'function') {
            callback(new Error('Invalid argument. Expected function.'));
            return;
        }
        //try to get from cache
        self.get(key, function (err, result) {
            if (err) {
                callback(err);
                return;
            }
            if (typeof result !== 'undefined') {
                callback(null, result);
            } else {
                //execute fn
                fn(function (err, result) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    self.add(key, (typeof result === 'undefined') ? null : result, self.ttl, function () {
                        callback(null, result);
                    });
                });
            }
        });
    }
    /**
     * Gets a cached value defined by the given key.
     * @param {string|*} key - A string that represents the key of the cached value
     * @param {function(Error=,*=)} callback - A callback function where the first argument will contain the Error object if an error occurred and the second argument will contain the result.
     */
    get(key, callback) {
        let self = this;
        callback = callback || function () { };
        if (key == null) {
            return callback();
        }
        self.init(function (err) {
            if (err) {
                callback(err);
            } else {
                self.rawCache.get(key, function (err, value) {
                    if (err) {
                        callback(err);
                    } else {
                        if (typeof value[key] !== 'undefined') {
                            callback(null, value[key]);
                        } else {
                            callback();
                        }
                    }
                });
            }
        });
    }
    /**
     * @returns DataCache
     */
    static getCurrent() {
        if (typeof global !== 'undefined' || global !== null) {
            let app = global.application;
            if (app) {
                //and if this application has a cache object
                if (app.cache) {
                    //use this cache
                    return app.cache;
                }
            }
        }
        if (DataCache[currentProperty]) {
            return DataCache[currentProperty];
        }
        DataCache[currentProperty] = new DataCache();
        return DataCache[currentProperty];
    }
}

class DataCacheStrategy extends ConfigurationStrategy {
    // noinspection JSValidateJSDoc
    /**
     * @param {ConfigurationBase} config
     */
    constructor(config) {
        super(config);
    }
    /**
     * Sets a key value pair in cache.
     * @abstract
     * @param {string} key - A string that represents the key of the cached value
     * @param {*} value - The value to be cached
     * @param {number=} absoluteExpiration - An absolute expiration time in seconds. This parameter is optional.
     * @returns {Promise|*}
     */
    // eslint-disable-next-line no-unused-vars
    add(key, value, absoluteExpiration) {
        throw new AbstractMethodError();
    }
    /**
     * Removes a cached value.
     * @abstract
     * @param {string} key - A string that represents the key of the cached value to be removed
     * @returns {Promise|*}
     */
    // eslint-disable-next-line no-unused-vars
    remove(key) {
        throw new AbstractMethodError();
    }
    /**
     * Flush all cached data.
     * @abstract
     * @returns {Promise|*}
     */
    clear() {
        throw new AbstractMethodError();
    }
    /**
     * Gets a cached value defined by the given key.
     * @param {string} key
     * @returns {Promise|*}
     */
    // eslint-disable-next-line no-unused-vars
    get(key) {
        throw new AbstractMethodError();
    }
    /**
     * Gets data from cache or executes the defined function and adds the result to the cache with the specified key
     * @param {string|*} key - A string which represents the key of the cached data
     * @param {Function} getFunc - A function to execute if data will not be found in cache
     * @param {number=} absoluteExpiration - An absolute expiration time in seconds. This parameter is optional.
     * @returns {Promise|*}
     */
    // eslint-disable-next-line no-unused-vars
    getOrDefault(key, getFunc, absoluteExpiration) {
        throw new AbstractMethodError();
    }
}

// noinspection JSValidateJSDoc
/**
 *
 * @param {ConfigurationBase} config
 * @constructor
 *
 */
class DefaultDataCacheStrategy extends DataCacheStrategy {
    constructor(config) {
        super(config);
        let NodeCache = require('node-cache');
        let expiration = CACHE_ABSOLUTE_EXPIRATION;
        let absoluteExpiration = LangUtils.parseInt(config.getSourceAt('settings/cache/absoluteExpiration'));
        if (absoluteExpiration > 0) {
            expiration = absoluteExpiration;
        }
        this.rawCache = new NodeCache({
            stdTTL: expiration
        });
    }
    /**
     * Sets a key value pair in cache.
     * @param {string} key - A string that represents the key of the cached value
     * @param {*} value - The value to be cached
     * @param {number=} absoluteExpiration - An absolute expiration time in seconds. This parameter is optional.
     * @returns {Promise|*}
     */
    // eslint-disable-next-line no-unused-vars
    add(key, value, absoluteExpiration) {
        let self = this;
        return new Promise(function (resolve, reject) {
            self.rawCache.set(key, value, absoluteExpiration, function (err) {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
    /**
     * Gets a cached value defined by the given key.
     * @param {string} key
     * @returns {Promise|*}
     */
    // eslint-disable-next-line no-unused-vars
    get(key) {
        let self = this;
        return new Promise(function (resolve, reject) {
            self.rawCache.get(key, function (err, res) {
                if (err) {
                    return reject(err);
                }
                return resolve(res[key]);
            });
        });
    }
    /**
     * Removes a cached value.
     * @param {string} key - A string that represents the key of the cached value to be removed
     * @returns {Promise|*}
     */
    // eslint-disable-next-line no-unused-vars
    remove(key) {
        let self = this;
        return new Promise(function (resolve, reject) {
            self.rawCache.del(key, function (err, count) {
                if (err) {
                    return reject(err);
                }
                return resolve(count);
            });
        });
    }
    /**
     * Flush all cached data.
     * @returns {Promise|*}
     */
    clear() {
        let self = this;
        return new Promise(function (resolve, reject) {
            self.rawCache.flushAll(function (err, count) {
                if (err) {
                    return reject(err);
                }
                return resolve(count);
            });
        });
    }
    /**
     * Gets data from cache or executes the defined function and adds the result to the cache with the specified key
     * @param {string|*} key - A string which represents the key of the cached data
     * @param {Function} getFunc - A function to execute if data will not be found in cache
     * @param {number=} absoluteExpiration - An absolute expiration time in seconds. This parameter is optional.
     * @returns {Promise|*}
     */
    // eslint-disable-next-line no-unused-vars
    getOrDefault(key, getFunc, absoluteExpiration) {
        let self = this;
        return new Promise(function (resolve, reject) {
            //try to get from cache
            self.rawCache.get(key, function (err, result) {
                if (err) {
                    return reject(err);
                } else if (typeof result !== 'undefined' && hasOwnProperty(result, key)) {
                    return resolve(result[key]);
                } else {
                    try {
                        //execute function and validate promise
                        let source = getFunc();
                        Args.check(typeof source !== 'undefined' && typeof source.then === 'function', 'Invalid argument. Expected a valid promise.');
                        return source.then(function (res) {
                            if (res == null) {
                                return resolve();
                            }
                            return self.rawCache.set(key, res, absoluteExpiration, function (err) {
                                if (err) {
                                    return reject(err);
                                }
                                return resolve(res);
                            });
                        })
                            .catch(function (err) {
                                return reject(err);
                            });
                    } catch (err) {
                        return reject(err);
                    }
                }
            });
        });
    }
}

module.exports = {
    DataCache,
    DataCacheStrategy,
    DefaultDataCacheStrategy
};

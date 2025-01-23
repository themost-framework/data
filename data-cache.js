// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
var {AbstractMethodError, ConfigurationStrategy} = require('@themost/common');
var NodeCache = require( 'node-cache' );
var CACHE_ABSOLUTE_EXPIRATION = 1200;

class DataCacheStrategy extends ConfigurationStrategy {
    /**
     *
     * @param {import('@themost/common').ConfigurationBase} config
     * @constructor
     *
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

    // noinspection JSUnusedLocalSymbols
    /**
     * Gets a cached value defined by the given key.
     * @param {string} key
     * @returns {Promise|*}
     */
    // eslint-disable-next-line no-unused-vars
    get(key) {
        throw new AbstractMethodError();
    }

    // noinspection JSUnusedLocalSymbols
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

class DefaultDataCacheStrategy extends DataCacheStrategy {
    /**
     *
     * @param {import('@themost/common').ConfigurationBase} config
     * @constructor
     *
     */
    constructor(config) {
        super(config);
        var expiration = CACHE_ABSOLUTE_EXPIRATION;
        var absoluteExpiration = config.getSourceAt('settings/cache/absoluteExpiration');
        if (typeof absoluteExpiration === 'number' && absoluteExpiration > 0) {
            expiration = absoluteExpiration;
        }
        this.rawCache = new NodeCache({
            stdTTL:expiration
        });
    }

    /**
     * Sets a key value pair in cache.
     * @param {string} key - A string that represents the key of the cached value
     * @param {*} value - The value to be cached
     * @param {number=} absoluteExpiration - An absolute expiration time in seconds. This parameter is optional.
     * @returns {Promise|*}
     */
    add(key, value, absoluteExpiration) {
        var self = this;
        return new Promise(function(resolve, reject) {
            try {
                void self.rawCache.set(key, value, absoluteExpiration, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            } catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Gets a cached value defined by the given key.
     * @param {string} key
     * @returns {Promise|*}
     */
    get(key) {
        var self = this;
        return new Promise(function(resolve, reject) {
            try {
                void self.rawCache.get(key, function(err, res) {
                    if (err) {
                        return reject(err);
                    }
                    if (Object.prototype.hasOwnProperty.call(res, key)) {
                        return resolve(res[key]);
                    }
                    return resolve();
                });
            } catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Removes a cached value.
     * @param {string} key - A string that represents the key of the cached value to be removed
     * @returns {Promise|*}
     */
    remove(key) {
        var self = this;
        return new Promise(function(resolve, reject) {
            try {
                void self.rawCache.del(key, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            } catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Flush all cached data.
     * @returns {Promise|*}
     */
    clear() {
        var self = this;
        return new Promise(function(resolve, reject) {
            try {
                void self.rawCache.flushAll((err) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            } catch (err) {
                return reject(err);
            }
            return resolve();
        });
    }

    finalize() {
        var self = this;
        return self.clear().then(function() {
            if (self.rawCache.checkTimeout != null) {
                clearTimeout(self.rawCache.checkTimeout);
                return Promise.resolve();
            }
        });
    }

    /**
     * Gets data from cache or executes the defined function and adds the result to the cache with the specified key
     * @param {string|*} key - A string which represents the key of the cached data
     * @param {Function} getFunc - A function to execute if data will not be found in cache
     * @param {number=} absoluteExpiration - An absolute expiration time in seconds. This parameter is optional.
     * @returns {Promise|*}
     */
    getOrDefault(key, getFunc, absoluteExpiration) {
        var self = this;
        return new Promise(function(resolve, reject) {
            //try to get from cache
            try {
                void self.rawCache.get(key, (err, res) => {
                    if (typeof res !== 'undefined') {
                        if (Object.prototype.hasOwnProperty.call(res, key)) {
                            return resolve(res[key]);
                        }
                    }
                    try {
                        void getFunc().then(function (res) {
                            void self.rawCache.set(key, res, absoluteExpiration, (err) => {
                                if (err) {
                                    return reject(err);
                                }
                                return resolve(res);
                            });
                        }).catch(function(err) {
                            return reject(err);
                        })
                    } catch (err) {
                        return reject(err);
                    }
                });
            } catch (err) {
                return reject(err);
            }
        });
    }
}

module.exports = {
    DataCacheStrategy,
    DefaultDataCacheStrategy
}

/* eslint-disable node/no-unpublished-require */
const { DataApplication } = require('../data-application');
const { DataCacheStrategy } = require('../data-cache');
const { SqliteAdapter } = require('@themost/sqlite');
const { GenericPoolAdapter, createInstance } = require('@themost/pool');
const { DataConfigurationStrategy, SchemaLoaderStrategy } = require('../data-configuration');
const path = require('path');
const fs = require('fs');
const { Guid, TraceUtils } = require('@themost/common');
const { CacheEntrySchema } = require('./CacheEntry');
const MD5 = require('crypto-js/md5');
const { QueryExpression } = require('@themost/query');

const CACHE_ABSOLUTE_EXPIRATION = 1200;

if (typeof Guid.from !== 'function') {
    Guid.from = function(value) {
        var str = MD5(value).toString();
        return new Guid([
            str.substring(0, 8),
            str.substring(8, 12),
            str.substring(12, 16),
            str.substring(16, 20),
            str.substring(20, 32)
        ].join('-'));
    }
}

class MemoryCacheApplication extends DataApplication {
    constructor() {
        super(path.resolve(process.cwd(), '.cache'));
        const config = this.configuration.getStrategy(DataConfigurationStrategy);
        Object.assign(config.adapterTypes, {
            sqlite: {
                invariantName: 'sqlite',
                type: SqliteAdapter,
                createInstance: (options) => {
                    return new SqliteAdapter(options);
                }
            },
            pool: {
                invariantName: 'pool',
                type: GenericPoolAdapter,
                createInstance: createInstance
            }
        });
        config.adapters.push(
            {
                name: 'cache+pool',
                invariantName: 'pool',
                default: true,
                options: {
                    adapter: 'cache',
                    max: 25,
                    min: 2
                }
            },{
                name: 'cache',
                invariantName: 'sqlite',
                options: {
                    database: path.resolve(process.cwd(), '.cache', 'cache.db')
                }
            }
        );
        const schema = this.configuration.getStrategy(SchemaLoaderStrategy);
        schema.setModelDefinition(CacheEntrySchema);
        const executionPath = this.getConfiguration().getExecutionPath();
        TraceUtils.debug('Validating cache service path: ' + executionPath);
        void fs.stat(executionPath, (err) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    TraceUtils.debug('Creating cache service path: ' + executionPath);
                    void fs.mkdir(executionPath, (err) => {
                        if (err) {
                            TraceUtils.error(err);
                            return;
                        }
                        TraceUtils.debug('Cache service path created successfully.');
                    });
                } else {
                    TraceUtils.error(err);
                }
            }
        });
        const absoluteExpiration = this.configuration.getSourceAt('settings/cache/absoluteExpiration');
        if (typeof absoluteExpiration === 'number' && absoluteExpiration >= 0) {
            this.absoluteExpiration = absoluteExpiration;
        } else {
            this.absoluteExpiration = CACHE_ABSOLUTE_EXPIRATION;
        }
    }
}

class MemoryCacheStrategy extends DataCacheStrategy {
    
    constructor(config) {
        super(config);
        this.rawCache = new MemoryCacheApplication();
    }

    /**
     * Gets a key value pair from cache
     * @param {*} key 
     * @returns Promise<*>
     */
    async get(key) {
        const context = this.rawCache.createContext();
        try {
            const entry = await context.model('CacheEntry').asQueryable().where((x, key) => {
                return x.path === key && x.location === 'server';
            }, key).getItem();
            const {sourceAdapter: CacheEntries} = context.model('CacheEntry');
            if (entry && entry.doomed) {
                // execute ad-hoc query
                // remove doomed entry
                await context.db.executeAsync(
                    new QueryExpression().delete(CacheEntries).where((x, id) => {
                        return x.id === id;
                    }, entry.id)
                );
                return;
            }
            if (entry && entry.expiredAt && entry.expiredAt < new Date()) {
                // execute ad-hoc query
                // set doomed to true
                await context.db.executeAsync(
                    new QueryExpression().update(CacheEntries).set({
                        doomed: true
                    }).where((x, id) => {
                        return x.id === id;
                    }, entry.id)
                );
            }
            if (entry && entry.content) {
                return entry.content;
            }
            return;
        } finally {
            await context.finalizeAsync();
        }
    }

    /**
     * Sets a key value pair in cache.
     * @param {*} key - The key to be cached
     * @param {*} value - The value to be cached
     * @param {number=} absoluteExpiration - The expiration time in seconds
     * @returns {Promise<*>}
     */
    async add(key, value, absoluteExpiration) {
        const context = this.rawCache.createContext();
        const CacheEntries = context.model('CacheEntry');
        try {
            // create uuid from unique constraint attributes
            // (avoid checking if exists)
            const entry = {
                path: key,
                location: 'server',
                contentEncoding: 'application/json',
                headers: null,
                params: null,
                customParams: null
            }
            // get id
            const id = Guid.from(entry).toString();
            // assign extra properties
            Object.assign(entry, {
                id: id,
                content: value,
                createdAt: new Date(),
                modifiedAt: new Date(),
                expiredAt: absoluteExpiration ? new Date(Date.now() + ((absoluteExpiration || 0) * 1000)) : null,
                doomed: false
            });
            // insert or update cache entry
            await CacheEntries.upsert(entry);
            return value;
        } finally {
            await context.finalizeAsync();
        }
    }

    /**
     * Removes a key from cache
     * @param {*} key 
     */
    async remove(key) {
        const context = this.rawCache.createContext();
        const {sourceAdapter: CacheEntries} = context.model('CacheEntry');
        try {
            // remove using an ad-hoc query to support wildcard characters
            const searchPath = key.replace(/\*/g, '%');
            await context.db.executeAsync(
                new QueryExpression().delete(CacheEntries).where((x, search) => {
                    return x.path.includes(search) === true && x.location === 'server';
                }, searchPath)
            );
        } finally {
            await context.finalizeAsync();
        }
    }

    async clear() {
        throw new Error('Method not implemented.');
    }

    /**
     * Gets a key value pair from cache or invokes the given function and returns the value before caching it.
     * @param {*} key 
     * @param {function():Promise<*>} getFunc The function to be invoked if the key is not found in cache
     * @param {number=} absoluteExpiration The expiration time in seconds
     * @returns 
     */
    async getOrDefault(key, getFunc, absoluteExpiration) {
        // try to get entry from cache
        const value = await this.get(key);
        // if entry exists
        if (typeof value !== 'undefined') {
            // return value
            return value;
        }
        // otherwise, get value by invoking function
        const result = await getFunc();
        // add value to cache
        await this.add(key, typeof result === 'undefined' ? null : result, absoluteExpiration);
        // return value
        return result;
    }
}

module.exports = { MemoryCacheStrategy };
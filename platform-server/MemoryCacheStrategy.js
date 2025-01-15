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
    }
}

class MemoryCacheStrategy extends DataCacheStrategy {
    
    constructor(config) {
        super(config);
        this.cache = new MemoryCacheApplication();
    }

    async get(key) {
        const context = this.cache.createContext();
        try {
            const entry = await context.model('CacheEntry').asQueryable().where((x, key) => {
                return x.path === key && x.location === 'server';
            }, key).getItem();
            if (entry && entry.doomed) {
                return;
            }
            if (entry && entry.content) {
                return entry.content;
            }
            return;
        } finally {
            await context.finalizeAsync();
        }
    }

    async add(key, value, absoluteExpiration) {
        const context = this.cache.createContext();
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
                expiredAt: absoluteExpiration ? new Date(Date.now() + (absoluteExpiration || 0)) : null,
                doomed: false
            });
            // insert or update cache entry
            await CacheEntries.upsert(entry);
            return value;
        } finally {
            await context.finalizeAsync();
        }
    }
    async remove(key) {
        const context = this.cache.createContext();
        const CacheEntries = context.model('CacheEntry');
        try {
            await CacheEntries.remove({
                path: key
            });
        } finally {
            await context.finalizeAsync();
        }
    }

    async clear() {
        throw new Error('Method not implemented.');
    }

    async getOrDefault(key, getFunc, absoluteExpiration) {
        const context = this.cache.createContext();
        const CacheEntries = context.model('CacheEntry');
        try {
            const entry = await CacheEntries.asQueryable().where((x, key) => {
                return x.path === key &&
                    x.location === 'server' &&
                    x.doomed === false;
            }, key).select(({content, contentEncoding}) => ({
                content, contentEncoding
            })).getItem();
            if (entry && typeof entry.content !== 'undefined') {
                return entry.content;
            }
            // get value from function
            const result = await getFunc();
            // add value to cache
            await this.add(key, result, absoluteExpiration);
            // return value
            return result;
        } finally {
            await context.finalizeAsync();
        }
    }
}

module.exports = { MemoryCacheStrategy };
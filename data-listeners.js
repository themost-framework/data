// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const {eachSeries} = require('async');
// eslint-disable-next-line no-unused-vars
const {QueryUtils, QueryField, QueryExpression} = require('@themost/query');
const {QueryFieldRef} = require('@themost/query/query');
const {NotNullError, UniqueConstraintError, TraceUtils, TextUtils} = require('@themost/common');
const { DataCacheStrategy } = require('./data-cache');
const { FunctionContext } = require('./functions');
/**
 * @classdesc Represents an event listener for validating not nullable fields. This listener is automatically  registered in all data models.
 */
class NotNullConstraintListener {
    constructor() {
        //
    }
    /**
     * Occurs before creating or updating a data object and validates not nullable fields.
     * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    beforeSave(event, callback) {
        //find all attributes that have not null flag
        let attrs = event.model.attributes.filter(function (x) {
            return !x.primary && !(typeof x.nullable === 'undefined' ? true : x.nullable);
        });
        if (attrs.length === 0) {
            callback(null);
            return 0;
        }
        eachSeries(attrs, function (attr, cb) {
            let name = attr.property || attr.name, value = event.target[name];
            if ((((value === null) || (value === undefined)) && (event.state === 1))
                || ((value === null) && (typeof value !== 'undefined') && (event.state === 2))) {
                let er = new NotNullError('A value is required.', null, event.model.name, attr.name);
                TraceUtils.debug(er);
                return cb(er);
            } else {
                return cb();
            }
        }, function (err) {
            callback(err);
        });
    }
}

/**
 * @classdesc Represents an event listener for validating data model's unique constraints. This listener is automatically registered in all data models.
 */
class UniqueConstraintListener {
    constructor() {
        //
    }
    /**
     * Occurs before creating or updating a data object and validates the unique constraints of data model.
     * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    beforeSave(event, callback) {
        //there are no constraints
        if (event.model.constraints === null) {
            //do nothing
            callback(null);
            return;
        }
        //get unique constraints
        let constraints = event.model.constraints.filter(function (x) {
            return (x.type === 'unique');
        });
        if (constraints.length === 0) {
            //do nothing
            callback(null);
            return;
        }
        eachSeries(constraints, function (constraint, cb) {
            /**
             * @type {DataQueryable}
             */
            let q;
            //build query
            for (let i = 0; i < constraint.fields.length; i++) {
                let attr = constraint.fields[i];
                let value = event.target[attr];
                if (typeof value === 'undefined') {
                    cb(null);
                    return;
                }
                //check field mapping
                let mapping = event.model.inferMapping(attr);
                if (typeof mapping !== 'undefined' && mapping !== null) {
                    if (typeof event.target[attr] === 'object') {
                        value = event.target[attr][mapping.parentField];
                    }
                }
                if (typeof value === 'undefined') {
                    value = null;
                }
                if (q) {
                    q.and(attr).equal(value);
                } else {
                    q = event.model.where(attr).equal(value);
                }
            }
            if (typeof q === 'undefined') {
                cb(null);
            } else {
                q.silent().select(event.model.primaryKey).first(function (err, result) {
                    if (err) {
                        cb(err);
                        return;
                    }
                    if (!result) {
                        //object does not exist
                        cb(null);
                    } else {
                        let objectExists = true;
                        if (event.state === 2) {
                            //validate object id (check if target object is the same with the returned object)
                            objectExists = (result[event.model.primaryKey] !== event.target[event.model.primaryKey]);
                        }
                        //if object already exists
                        if (objectExists) {
                            let er;
                            //so throw exception
                            if (constraint.description) {
                                er = new UniqueConstraintError(constraint.description, null, event.model.name);
                            } else {
                                er = new UniqueConstraintError('Object already exists. A unique constraint violated.', null, event.model.name);
                            }
                            TraceUtils.debug(er);
                            return cb(er);
                        } else {
                            return cb();
                        }
                    }
                });
            }
        }, function (err) {
            callback(err);
        });
    }
}

/**
 * @classdesc Represents an event listener which calculates field values. This listener is being registered for all data models.
 */
class CalculatedValueListener {
    constructor() {
        //
    }
    /**
     * Occurs before creating or updating a data object and calculates field values with the defined calculation expression.
     * @param {DataEventArgs} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    beforeSave(event, callback) {
        //get function context
        let functionContext = new FunctionContext();
        Object.assign(functionContext, event);
        functionContext.context = event.model.context;
        //find all attributes that have a default value
        let attrs = event.model.attributes.filter(function (x) {
            return (x.calculation !== undefined); 
        });
        eachSeries(attrs, function (attr, cb) {
            let expr = attr.calculation;
            //validate expression
            if (typeof expr !== 'string') {
                event.target[attr.name] = expr;
                return cb();
            }
            //check javascript: keyword for code evaluation
            if (expr.indexOf('javascript:') === 0) {
                //get expression
                let fnstr = expr.substring('javascript:'.length);
                //if expression starts with function add parenthesis (fo evaluation)
                if (fnstr.indexOf('function') === 0) {
                    fnstr = '('.concat(fnstr, ')');
                } else if (fnstr.indexOf('return') === 0) {
                    //if expression starts with return then normalize expression (surround with function() {} keyword)
                    fnstr = '(function() { '.concat(fnstr, '})');
                }
                let value = eval(fnstr);
                //if value is function
                if (typeof value === 'function') {
                    //then call function against the target object
                    let value1 = value.call(functionContext);
                    if (typeof value1 !== 'undefined' && value1 !== null && typeof value1.then === 'function') {
                        //we have a promise, so we need to wait for answer
                        value1.then(function (result) {
                            //otherwise set result
                            event.target[attr.name] = result;
                            return cb();
                        }).catch(function (err) {
                            cb(err);
                        });
                    } else {
                        event.target[attr.name] = value1;
                        return cb();
                    }
                } else if (typeof value !== 'undefined' && value !== null && typeof value.then === 'function') {
                    //we have a promise, so we need to wait for answer
                    value.then(function (result) {
                        //otherwise set result
                        event.target[attr.name] = result;
                        return cb();
                    }).catch(function (err) {
                        cb(err);
                    });
                } else {
                    //otherwise get value
                    event.target[attr.name] = value;
                    return cb();
                }
            } else if (expr.indexOf('fn:') === 0) {
                return cb(new Error('fn: syntax is deprecated.'));
            } else {
                functionContext.eval(expr, function (err, result) {
                    if (err) {
                        cb(err);
                    } else {
                        event.target[attr.name] = result;
                        cb(null);
                    }
                });
            }
        }, function (err) {
            callback(err);
        });
    }
}


/**
 * @classdesc Represents a data caching listener which is going to be used while executing queries against
 * data models where data caching is enabled. This listener is registered by default.
 */
class DataCachingListener {
    constructor() {
        //
    }
    /**
     * Occurs before executing an query expression, validates data caching configuration and gets cached data.
     * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    beforeExecute(event, callback) {
        try {
            if (event == null) {
                return callback();
            }
            //validate caching
            let caching = (event.model.caching === 'always' || event.model.caching === 'conditional');
            if (!caching) {
                return callback();
            }
            // get cache attribute
            let dataCache;
            if (event.emitter && typeof event.emitter.data === 'function') {
                dataCache = event.emitter.data('cache');
            }
            // if caching is enabled and cache attribute is defined
            if (typeof dataCache === 'boolean' && dataCache === false) {
                return callback();
            }
            //validate conditional caching
            if (event.model.caching === 'conditional') {
                if (event.emitter && typeof event.emitter.data === 'function') {
                    if (!event.emitter.data('cache')) {
                        return callback();
                    }
                }
            }
            /**
             * @type {DataCacheStrategy}
             */
            let cache = event.model.context.getConfiguration().getStrategy(DataCacheStrategy);
            if (typeof cache === 'undefined' || cache === null) {
                return callback();
            }
            if (event.query && event.query.$select) {
                //create hash
                let hash;
                if (event.emitter && typeof event.emitter.toMD5 === 'function') {
                    //get hash from emitter (DataQueryable)
                    hash = event.emitter.toMD5();
                } else {
                    //else calculate hash
                    hash = TextUtils.toMD5({ query: event.query });
                }
                //format cache key
                let key = '/' + event.model.name + '/?query=' + hash;
                //calculate execution time (debug)
                let logTime = new Date().getTime();
                //query cache
                cache.get(key).then(function (result) {
                    if (typeof result !== 'undefined') {
                        //delete expandable
                        if (event.emitter) {
                            delete event.emitter.$expand;
                        }
                        //set cached flag
                        event['cached'] = true;
                        //set execution default
                        event['result'] = result;
                        //log execution time (debug)
                        try {
                            if (process.env.NODE_ENV === 'development') {
                                TraceUtils.debug(`Cache (Execution Time: ${(new Date()).getTime() - logTime}ms) : ${key}`);
                            }
                        } catch (err) {
                            //
                        }
                        //exit
                        return callback();
                    } else {
                        //do nothing and exit
                        return callback();
                    }
                }).catch(function (err) {
                    TraceUtils.log('DataCacheListener: An error occurred while trying to get cached data.');
                    TraceUtils.log(err);
                    return callback();
                });
            } else {
                return callback();
            }
        } catch (err) {
            return callback(err);
        }
    }
    /**
     * Occurs before executing an query expression, validates data caching configuration and stores data to cache
     * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    afterExecute(event, callback) {
        try {
            //validate caching
            let caching = (event.model.caching === 'always' || event.model.caching === 'conditional');
            if (!caching) {
                return callback();
            }
            // get cache attribute
            let dataCache;
            if (event.emitter && typeof event.emitter.data === 'function') {
                dataCache = event.emitter.data('cache');
            }
            // if caching is enabled and cache attribute is defined
            if (typeof dataCache === 'boolean' && dataCache === false) {
                return callback();
            }
            //validate conditional caching
            if (event.model.caching === 'conditional') {
                if (event.emitter && typeof event.emitter.data === 'function') {
                    if (!event.emitter.data('cache')) {
                        return callback();
                    }
                }
            }
            /**
             * @type {DataCacheStrategy}
             */
            let cache = event.model.context.getConfiguration().getStrategy(DataCacheStrategy);
            if (typeof cache === 'undefined' || cache === null) {
                return callback();
            }
            if (event.query && event.query.$select) {
                if (typeof event.result !== 'undefined' && !event.cached) {
                    //create hash
                    let hash;
                    if (event.emitter && typeof event.emitter.toMD5 === 'function') {
                        //get hash from emitter (DataQueryable)
                        hash = event.emitter.toMD5();
                    } else {
                        //else calculate hash
                        hash = TextUtils.toMD5({ query: event.query });
                    }
                    let key = '/' + event.model.name + '/?query=' + hash;
                    if (process.env.NODE_ENV === 'development') {
                        TraceUtils.debug('DataCacheListener: Setting data to cache [' + key + ']');
                    }
                    cache.add(key, event.result);
                    return callback();
                }
            }
            return callback();
        } catch (err) {
            return callback(err);
        }
    }
}


/**
 * @class
 * @constructor
 * @classdesc Represents an event listener for calculating default values.
 * DefaultValueListener is one of the default listeners which are being registered for all data models.
 */
class DefaultValueListener {
    constructor() {
        //
    }
    /**
     * Occurs before creating or updating a data object and calculates default values with the defined value expression.
     * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    beforeSave(event, callback) {
        let state = typeof event.state === 'number' ? event.state : 0;
        if (state !== 1) {
            return callback();
        } else {
            //get function context
            let functionContext = new FunctionContext();
            Object.assign(functionContext, event);
            //find all attributes that have a default value
            let attrs = event.model.attributes.filter(function (x) {
                return (typeof x.value !== 'undefined'); 
            });
            eachSeries(attrs, function (attr, cb) {
                try {
                    let expr = attr.value;
                    //if attribute is already defined
                    if (typeof event.target[attr.name] !== 'undefined') {
                        //do nothing
                        cb(null);
                        return;
                    }
                    //validate expression
                    if (typeof expr !== 'string') {
                        event.target[attr.name] = expr;
                        return cb();
                    }
                    //check javascript: keyword for code evaluation
                    if (expr.indexOf('javascript:') === 0) {
                        //get expression
                        let fnstr = expr.substring('javascript:'.length);
                        //if expression starts with function add parenthesis (fo evaluation)
                        if (fnstr.indexOf('function') === 0) {
                            fnstr = '('.concat(fnstr, ')');
                        } else if (fnstr.indexOf('return') === 0) {
                            //if expression starts with return then normalize expression (surround with function() {} keyword)
                            fnstr = '(function() { '.concat(fnstr, '})');
                        }
                        let value = eval(fnstr);
                        //if value is function
                        if (typeof value === 'function') {
                            //then call function against the target object
                            let value1 = value.call(functionContext);
                            if (typeof value1 !== 'undefined' && value1 != null && typeof value1.then === 'function') {
                                //we have a promise, so we need to wait for answer
                                value1.then(function (result) {
                                    //otherwise set result
                                    event.target[attr.name] = result;
                                    return cb();
                                }).catch(function (err) {
                                    return cb(err);
                                });
                            } else {
                                event.target[attr.name] = value1;
                                return cb();
                            }
                        } else if (typeof value !== 'undefined' && value != null && typeof value.then === 'function') {
                            //we have a promise, so we need to wait for answer
                            value.then(function (result) {
                                //otherwise set result
                                event.target[attr.name] = result;
                                return cb();
                            }).catch(function (err) {
                                return cb(err);
                            });
                        } else {
                            //otherwise get value
                            event.target[attr.name] = value;
                            return cb();
                        }
                    } else if (expr.indexOf('fn:') === 0) {
                        return cb(new Error('fn: syntax is deprecated.'));
                    } else {
                        functionContext.eval(expr, function (err, result) {
                            if (err) {
                                return cb(err);
                            }
                            event.target[attr.name] = result;
                            return cb();
                        });
                    }
                } catch (err) {
                    return cb(err);
                }
            }, function (err) {
                callback(err);
            });
        }
    }
}

/**
 * @class
 * @constructor
 */
class DataModelCreateViewListener {
    constructor() {
        //
    }
    /**
     * Occurs after upgrading a data model.
     * @param {DataEventArgs} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    afterUpgrade(event, callback) {
        let self = event.model, db = self.context.db;
        let view = self.viewAdapter, adapter = self.sourceAdapter;
        // if data model is a sealed model do nothing anb exit
        if (self.sealed) {
            return callback();
        }
        // if view adapter is the same with source adapter do nothing and exit
        if (view === adapter) {
            return callback();
        }
        // get base model
        let baseModel = self.base();
        // get array of fields
        let fields = self.attributes.filter(function (x) {
            return (self.name === x.model) && (!x.many);
        }).map(function (x) {
            return QueryField.select(x.name).from(adapter);
        });
        /**
         * @type {QueryExpression}
         */
        let q = QueryUtils.query(adapter).select(fields);
        let baseAdapter = null;
        let baseFields = [];
        // enumerate attributes of base model (if any)
        if (baseModel) {
            // get base adapter
            baseAdapter = baseModel.viewAdapter;
            // enumerate base model attributes
            baseModel.attributes.forEach(function (x) {
                //get all fields (except primary and one-to-many relations)
                if ((!x.primary) && (!x.many)) {
                    baseFields.push(QueryField.select(x.name).from(baseAdapter));
                }
            });
        }
        if (baseFields.length > 0) {
            let from = new QueryFieldRef(adapter, self.key().name);
            let to = new QueryFieldRef(baseAdapter, self.base().key().name);
            q.$expand = { $entity: {}, $with: [] };
            q.$expand.$entity[baseAdapter] = baseFields;
            q.$expand.$with.push(from);
            q.$expand.$with.push(to);
        }
        //execute query
        return db.createView(view, q, function (err) {
            callback(err);
        });
    }
}

class DataModelSeedListener {
    constructor() {
        //
    }
    /**
     * Occurs after upgrading a data model.
     * @param {DataEventArgs} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    afterUpgrade(event, callback) {
        let thisModel = event.model;
        try {
            /**
             * Gets items to be seeded
             * @type {Array}
             */
            let items = thisModel.seed;
            //if model has an array of items to be seeded
            if (Array.isArray(items)) {
                if (items.length === 0) {
                    //if seed array is empty exit
                    return callback();
                }
                //try to insert items if model does not have any record
                return thisModel.asQueryable().silent().flatten().count().then(function(count) {
                    //if model has no data
                    if (count === 0) {
                        //set items state to new
                        items.forEach(function (x) {
                            x.$state = 1;
                        });
                        return thisModel.silent().save(items).then(function() {
                            return callback();
                        });
                    } else {
                        //model was already seeded
                        return callback();
                    }
                }).catch(function(err) {
                    return callback(err);
                });
            } else {
                //do nothing and exit
                return callback();
            }
        } catch (e) {
            callback(e);
        }
    }
}


class DataModelSubTypesListener {
    constructor() {
        //
    }
    /**
     * Occurs after upgrading a data model.
     * @param {DataEventArgs} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    afterUpgrade(event, callback) {
        let self = event.model, context = event.model.context;
        try {
            self.getSubTypes().then(function (result) {
                if (result.length === 0) {
                    return callback();
                }
                //enumerate sub types
                eachSeries(result, function (name, cb) {
                    //get model
                    let model = context.model(name);
                    if (model == null) {
                        return cb();
                    }
                    //if model is sealed do nothing
                    if (model.sealed) {
                        return cb();
                    }
                    //create event arguments
                    let ev = { model: model };
                    //execute create view listener
                    DataModelCreateViewListener.prototype.afterUpgrade(ev, cb);
                }, function (err) {
                    return callback(err);
                });
            }).catch(function (err) {
                return callback(err);
            });
        } catch (e) {
            callback(e);
        }
    }
}

module.exports = {
    NotNullConstraintListener,
    UniqueConstraintListener,
    CalculatedValueListener,
    DataCachingListener,
    DefaultValueListener,
    DataModelCreateViewListener,
    DataModelSeedListener,
    DataModelSubTypesListener
};

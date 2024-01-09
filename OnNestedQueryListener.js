const { QueryExpression, QueryField } = require('@themost/query');
const { DataPermissionEventListener } = require('./data-permission');
// eslint-disable-next-line no-unused-vars
const { DataEventArgs } = require('./types');
const { instanceOf } = require('./instance-of');
require('@themost/promise-sequence');

function beforeExecuteQuery(event) {
    return new Promise(function (resolve, reject) {
        return DataPermissionEventListener.prototype.beforeExecute(event, function (err) {
            if (err) {
                return reject(err);
            }
            return resolve();
        });
    });
}

/**
 * @implements {BeforeExecuteEventListener}
 */
class OnNestedQueryListener {
    /**
     * 
     * @param {DataEventArgs} event
     * @param {function} callback 
     */
    beforeExecute(event, callback) {
        OnNestedQueryListener.prototype.beforeExecuteAsync(event).then(function () {
            return callback();
        }).catch(function (err) {
            return callback(err);
        });
    }

    beforeExecuteAsync(event) {
        const query = event.emitter && event.emitter.query;
        const context = event.model.context;
        if (query == null) {
            return Promise.resolve();
        }
        // handle only select statements
        if (query.$select == null) {
            return Promise.resolve();
        }
        // if queryable is silent
        if (event.emitter.$silent) {
            // exit
            return Promise.resolve();
        }
        // validate emitter.$view
        const view = event.emitter && event.emitter.$view;
        if (view && view.privileges && view.privileges.length) {
            // DataEventPermissionListener will validate view privileges itself
            // so, do nothing and exit
            return Promise.resolve();
        }
        if (Object.prototype.hasOwnProperty.call(query, '$expand')) {
            // exit if expand is null or undefined
            if (query.$expand == null) {
                return Promise.resolve();
            }
            /**
             * @type {Array<{ $entity:{ model:string }}>}
             */
            const expand = Array.isArray(query.$expand) ? query.$expand : [query.$expand];
            if (expand.length) {
                const sources = expand.map(function (item) {
                    return function () {
                        // if entity is already a query expression
                        if (instanceOf(item.$entity, QueryExpression)) {
                            // do nothing
                            return Promise.resolve();
                        }
                        if (item.$entity && item.$entity.model) {
                            // get entity alias (which is a field of current model) 
                            if (item.$entity.$as != null) {
                                /**
                                 * @type {DataField}
                                 */
                                const attribute = event.model.getAttribute(item.$entity.$as);
                                if (attribute && attribute.nested) {
                                    return Promise.resolve();
                                }
                            }
                            /**
                             * @type {DataModel}
                             */
                            const nestedModel = context.model(item.$entity.model);
                            // if model exists
                            if (nestedModel != null) {
                                //
                                const nestedQuery = nestedModel.asQueryable().select().query;
                                return beforeExecuteQuery({
                                    query: nestedQuery,
                                    model: nestedModel
                                }).then(function () {
                                    // get entity
                                    /**
                                     * @type {{$as: string,$join:string,model:string}}
                                     */
                                    const entity = item.$entity;
                                    // set entity alias, if any
                                    if (entity.$as != null) {
                                        Object.defineProperty(nestedQuery, '$alias', {
                                            configurable: true,
                                            enumerable: true,
                                            writable: true,
                                            value: entity.$as
                                        });
                                    }
                                    // set join direction, if any
                                    if (entity.$join != null) {
                                        Object.defineProperty(nestedQuery, '$join', {
                                            configurable: true,
                                            enumerable: true,
                                            writable: true,
                                            value: entity.$join
                                        });
                                    }
                                    // set underlying model
                                    if (entity.model != null) {
                                        Object.defineProperty(nestedQuery, 'model', {
                                            configurable: true,
                                            enumerable: false,
                                            writable: true,
                                            value: entity.model
                                        });
                                    }
                                    let entityAlias;
                                    if (nestedQuery.$select) {
                                        for (var key in nestedQuery.$select) {
                                            if (Object.prototype.hasOwnProperty.call(nestedQuery.$select, key)) {
                                                entityAlias = key;
                                            }
                                        }
                                    }
                                    if (entityAlias) {
                                        Object.defineProperty(nestedQuery.$select, entityAlias, {
                                            configurable: true,
                                            enumerable: true,
                                            writable: true,
                                            value: [
                                                Object.assign(new QueryField(), {
                                                    $name: entityAlias.concat('.*')
                                                })
                                            ]
                                        });
                                    }
                                    // change item.$entity from QueryEntity to QueryExpression
                                    item.$entity = nestedQuery;
                                    return Promise.resolve();
                                });
                            }
                        }
                        return Promise.resolve();
                    }
                });
                return Promise.sequence(sources);
            }
        }
        return Promise.resolve();
    }

}

module.exports = {
    OnNestedQueryListener
}

const { DataPermissionEventListener } = require('./data-permission');
/**
 * @implements {BeforeExecuteEventListener}
 */
class OnNestedQueryListener {
    /**
     * 
     * @param {EventArgs} event 
     * @param {function} callback 
     */
    beforeExecute(event, callback) {
        OnNestedQueryListener.prototype.beforeExecuteAsync(event).then(function() {
            return callback();
        }).catch(function(err) {
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
        if (Object.prototype.hasOwnProperty.call(query, '$expand')) {
            /**
             * @type {{ $entity:{ model:string }} | Array<{ $entity:{ model:string }}>}
             */
            const expand = query.$expand;
            // exit if expand is null or undefined
            if (expand == null) {
                return Promise.resolve();
            }
            if (Array.isArray(expand)) {
                const beforeExecute2 = function(event) {
                    return new Promise(function(resolve, reject) {
                        return DataPermissionEventListener.prototype.beforeExecute(event, function(err) {
                            if (err) {
                                return reject(err);
                            }
                            return resolve();
                        });
                    });
                }
                const sources = expand.map(function(item) {
                    if (item.$entity && item.$entity.model) {
                        /**
                         * @type {DataModel}
                         */
                        const nestedModel = context.model(item.$entity.model);
                        // if model exists
                        if (nestedModel != null) {
                            //
                            const nestedQuery = nestedModel.asQueryable().select().query;
                            return beforeExecute2({
                                query: nestedQuery,
                                model: nestedModel
                            }).then(function() {
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
                                // set unerlying model
                                if (entity.model != null) {
                                    Object.defineProperty(nestedQuery, 'model', {
                                        configurable: true,
                                        enumerable: false,
                                        writable: true,
                                        value: entity.model
                                    });
                                }
                                // change item.$entity from QueryEntity to QueryExpression
                                item.$entity = nestedQuery;
                                return Promise.resolve();
                            });
                        }
                        return Promise.resolve();
                    } 
                });
                return Promise.all(sources);
            } else if (expand && expand.$entity && expand.$entity.model) {
                // get nested model
                const model = context.model(expand.$entity.model);
                if (model != null) {
                    //
                    return Promise.resolve();
                }
            }
        }
        return Promise.resolve();
    }

}

module.exports = {
    OnNestedQueryListener
}
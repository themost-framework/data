const { QueryExpression, QueryField } = require('@themost/query');
// eslint-disable-next-line no-unused-vars
const { DataEventArgs } = require('./types');
const { instanceOf } = require('./instance-of');
require('@themost/promise-sequence');


/**
 * @implements {BeforeExecuteEventListener}
 */
class OnNestedQueryOptionsListener {
    /**
     * 
     * @param {DataEventArgs} event
     * @param {function} callback 
     */
    beforeExecute(event, callback) {
        OnNestedQueryOptionsListener.prototype.beforeExecuteAsync(event).then(function () {
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
                            let options = null;
                            if (item.$entity.$as != null) {
                                // get current model
                                let currentModel = event.model;
                                /**
                                 * get attribute by name e.g. products.getAttributes('productionDescription')
                                 * @type {DataField}
                                 */
                                let attribute = currentModel.getAttribute(item.$entity.$as);
                                if (attribute == null) {
                                    if (item.$with) {
                                        // find another join by name
                                        const [key] = Object.keys(item.$with);
                                        if (key) {
                                            // get name e.g. orderedItem.id => orderedItem
                                            const [name] = key.split('.');
                                            if (name) {
                                                // find expand by name (which is join alias)
                                                // e.g. expand.find(x => x.$entity.$as === 'orderedItem')
                                                const findExpand = expand.find((x) => x.$entity.$as === name);
                                                if (findExpand) {
                                                    // get model by name
                                                    // e.g. context.model('Producn')
                                                    currentModel = context.model(findExpand.$entity.model);
                                                    if (currentModel) {
                                                        // get attribute by name
                                                        // e.g. products.getAttributes('productionDescription')
                                                        attribute = currentModel.getAttribute(item.$entity.$as);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    if (attribute == null) {
                                        return Promise.resolve();
                                    }
                                }
                                const mapping = currentModel.inferMapping(attribute.name);
                                if (mapping == null) {
                                    return Promise.resolve();
                                }
                                options = mapping.options;
                                if (options == null) {
                                    return Promise.resolve();
                                }
                                if (options.$filter == null) {
                                    return Promise.resolve();
                                }
                            }
                            /**
                             * @type {import('./data-model').DataModel}
                             */
                            const nestedModel = context.model(item.$entity.model);
                            // if model exists
                            if (nestedModel != null) {
                                return nestedModel.filterAsync(options).then((q) => {
                                    /**
                                     * @typedef {object} QueryExpressionWithPrepared
                                     * @property {*} $prepared
                                     */
                                    /** @type {QueryExpressionWithPrepared} */
                                    const { query } = q;
                                    const collection = item.$entity.name;
                                    Object.assign(item, {
                                        $entity: Object.assign(query, {
                                            $select: {
                                                [collection]: [
                                                    new QueryField({
                                                        $name: collection.concat('.*')
                                                    })
                                                ]
                                            },
                                            $alias: item.$entity.$as,
                                            $join: item.$entity.$join,
                                        }),
                                        model: item.$entity.model
                                    })
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
    OnNestedQueryOptionsListener
}

const { DataAssociationMapping } = require('./types');
const { DataPermissionEventListener } = require('./data-permission');
const { DataError } = require('@themost/common');
const cloneDeep = require('lodash/cloneDeep');
const { eachSeries } = require('async');
const { QueryField, SqlFormatter, QueryExpression} = require('@themost/query');

/**
 * @typedef {Object} SqlQueryDialect
 * @property {function(query: import('@themost/query').QueryExpression)} $query
 *
 * @typedef {SqlFormatter & SqlQueryDialect} SqlFormatterWithQueryDialect
 *
 */

if (typeof SqlFormatter.prototype.$query !== 'function') {
    /**
     * Formats a sub-query expression
     * @param {import('@themost/query').QueryExpression} query
     */
    SqlFormatter.prototype.$query = function(query) {
        if (typeof query.$select === 'object') {
            return query.hasPaging() ? `(${this.formatLimitSelect(query)})` : `(${this.formatSelect(query)})`;
        }
        throw new Error('Invalid query expression. Expected a valid select expression.');
    }
}


/**
 * @param {import('@themost/data').DataEventArgs} event
 * @param {function(err?:Error, supported?: boolean)} callback
 */
function supportsBeforeExecuteExpand(event, callback) {
    if (typeof event.result !== 'undefined') {
        return callback();
    }
    if (event.emitter == null) {
        return callback();
    }
    /**
     * @type {{emitter:import('./data-queryable').DataQueryable}}
     */
    const {emitter} = event;
    // Check if the emitter is a queryable object and if it has a select clause
    if (emitter.query && emitter.query.$select == null) {
        return callback();
    }
    // validate that formatter supports JSON array
    // noinspection JSUnresolvedReference
    if (typeof event.model.context.db.getFormatter !== 'function') {
        // exit without do nothing
        return callback();
    }
    // noinspection JSUnresolvedReference
    const formatter = event.model.context.db.getFormatter();
    if (formatter == null) {
        // exit without do nothing
        return callback();
    }
    // noinspection JSUnresolvedReference
    if (typeof formatter.$jsonGroupArray !== 'function') {
        // the formatter does not support JSON group array
        // exit without do nothing
        return callback();
    }
    return callback(null, true);
}

/**
 * @param {import('@themost/data').DataEventArgs} event
 * @return {Array<{expr:*, mapping:DataAssociationMapping}>}
 */
function getBeforeExecuteMappings(event) {
    if (event.emitter == null) {
        return [];
    }
    /**
     * @type {{expands:Array<*>, model:import('./data-model').DataModel}}
     */
    const {$expand, model} = event.emitter;
    if (Array.isArray($expand) && $expand.length > 0) {
        /**
         * @type {Array<DataAssociationMapping>}
         */
        return $expand.filter((expr) => {
            return expr != null;
        }).map((expr) => {
            if (expr instanceof DataAssociationMapping) {
                return {
                    expr,
                    mapping: cloneDeep(expr)
                };
            }
            if (typeof expr === 'string') {
                const mapping = model.inferMapping(expr);
                if (mapping) {
                    if (mapping.refersTo == null) {
                        mapping.refersTo = expr;
                    }
                    return {
                        expr,
                        mapping
                    };
                }
                throw new DataError('E_MAPPING', `Association mapping not found for ${model.name}.${expr}`, null, model.name, expr);
            }
            if (expr && expr.name) {
                const mapping = cloneDeep(model.inferMapping(expr.name));
                if (mapping) {
                    if (mapping.refersTo == null) {
                        mapping.refersTo = expr.name;
                    }
                    if (typeof expr.options === 'object') {
                        // merge options
                        mapping.options = mapping.options || {};
                        Object.assign(mapping.options, expr.options);
                    }
                    return {
                        expr,
                        mapping
                    };
                }
                throw new DataError('E_MAPPING', `Association mapping not found for ${model.name}.${expr.name}`, null, model.name, expr.name);
            }
            throw new DataError('E_EXPR', 'Invalid association mapping expression. Expected a string or a valid data association mapping.', null, model.name);
        });
    }
    return [];
}

class OnAfterGetExpandableObject {
    /**
     * @param {import('@themost/data').DataEventArgs} event
     * @param {function(err?:Error)} callback
     */
    afterExecute(event, callback) {
        if (event.emitter == null) {
            return callback();
        }
        if (event.result == null) {
            return callback();
        }
        /**
         * @type {{emitter:import('./data-queryable').DataQueryable}}
         */
        const {emitter} = event;
        // Check if the emitter is a queryable object and if it has a select clause
        if (emitter.query && emitter.query.$select == null) {
            return callback();
        }
        // get select query object name
        const [selectView] = Object.keys(event.emitter.query.$select);
        if (selectView == null) {
            return callback();
        }
        // get select fields of the current queryable
        const selectFields = event.emitter.query.$select[selectView];
        if (Array.isArray(selectFields) === false) {
            return callback();
        }
        if (selectFields && selectFields.length > 0) {
            const jsonFields = selectFields.filter((selectField) => {
                const [key] = Object.keys(selectField);
                return typeof selectField[key] === 'object' && (selectField[key].$query != null || selectField[key].$jsonArray != null);
            }).filter((selectField) => {
                const [key] = Object.keys(selectField);
                const { $query, $jsonArray } = selectField[key];
                if ($query && $query.$select) {
                    const [key] = Object.keys($query.$select);
                    if (key && key.length > 0) {
                        const [first] = $query.$select[key];
                        return first && first.value && (first.value.$jsonObject || first.value.$jsonArray);
                    }
                }
                return !!$jsonArray;
            }).map((selectField) => {
                const [key] = Object.keys(selectField);
                return key;
            });
            if (jsonFields.length > 0) {
                const result = event.result;
                if (Array.isArray(result)) {
                    result.forEach((item) => {
                        jsonFields.forEach((jsonField) => {
                            const { [jsonField]: value } = item;
                            if (value != null && typeof value === 'string') {
                                item[jsonField] = JSON.parse(value);
                            }
                        });
                    });
                } else if (typeof result === 'object') {
                    jsonFields.forEach((jsonField) => {
                        const { [jsonField]: value } = result;
                        if (value != null && typeof value === 'string') {
                            result[jsonField] = JSON.parse(value);
                        }
                    });
                }
            }
        }
        return callback();
    }
}

class OnBeforeGetExpandableAssociation {
    /**
     * @param {import('@themost/data').DataEventArgs} event
     * @param {function(err?:Error)} callback
     */
    beforeExecute(event, callback) {
        try {
            void supportsBeforeExecuteExpand(event, function (err, supported) {
                if (err) {
                    return callback(err);
                }
                try {
                    if (supported) {
                        const mappings = getBeforeExecuteMappings(event);
                        const {model} = event.emitter;
                        // get after execute listeners
                        const listeners = model.listeners('after.execute');
                        // and search for OnAfterGetExpandableObject listener to parse and format object that
                        // are going to be returned to the client by the current query execution using JSON-like queries
                        if (listeners.indexOf(OnAfterGetExpandableObject.prototype.beforeExecute) === -1) {
                            model.on('after.execute', OnAfterGetExpandableObject.prototype.afterExecute);
                        }
                        const { context } = model;
                        return eachSeries(mappings, (item, cb) => {
                            const { mapping, expr } = item;
                            try {
                                if (mapping.associationType === 'association' && mapping.childModel === model.name) {
                                    // get select query object name
                                    const [selectView] = Object.keys(event.emitter.query.$select);
                                    // get the view object of the current model
                                    const { viewAdapter: ModelView } = model;
                                    // get select fields of the current queryable
                                    const selectFields = event.emitter.query.$select[selectView];
                                    // try to include json-like query for getting foreign key association
                                    const options = mapping.options || {};
                                    // get associated model query
                                    const parentModel = context.model(mapping.parentModel);
                                    void parentModel.migrateAsync().then(() => {
                                        void parentModel.filterAsync(options).then((q) => {
                                            const { query } = q.prepare();
                                            // if select clause is not set, use queryable to select any field
                                            if (query.$select == null) {
                                                q.select();
                                            }
                                            // trigger a before execute event for making this procedure recursive
                                            const event = {
                                                model: parentModel,
                                                emitter: q,
                                                target: null
                                            };
                                            return new Promise((resolve, reject) => {
                                                // execute before execute event for the parent model of the current association
                                                void new OnBeforeGetExpandableAssociation().beforeExecute(event, (err) => {
                                                    if (err) {
                                                        return reject(err);
                                                    }
                                                    resolve(q);
                                                });
                                            });
                                        }).then((q) => {
                                            const { query } = q.prepare();
                                            // get the view object of the parent model e.g. PersonData
                                            const { viewAdapter: ParentView } = parentModel;
                                            // get the collection of the selected fields
                                            const fields = query.$select[ParentView] || [];
                                            // and create a json-like expression
                                            query.$select = {
                                                [ParentView]: [
                                                    {
                                                        value: {
                                                            $jsonObject: fields
                                                        }
                                                    }
                                                ]
                                            };
                                            // include where statement to filter parent model by child model using association mapping
                                            // pseudo-sql: WHERE ParentView.parentField = ModelView.childField
                                            query.where(
                                                new QueryField(mapping.parentField).from(ParentView)
                                            ).equal(
                                                new QueryField(mapping.childField).from(ModelView)
                                            );
                                            // trigger event listener for including any extra where expression according to user privileges
                                            void new DataPermissionEventListener().beforeExecute({
                                                model: parentModel, // set model, the instance of parent model of the current association
                                                emitter: q, // set event emitter, the instance of data queryable
                                                query: query, // set query, the instance of the modified query expression
                                                target: null
                                            }, (err) => {
                                                if (err) {
                                                    return cb(err);
                                                }
                                                // include json-like query in select clause of the current queryable
                                                selectFields.push({
                                                    [mapping.childField]: {
                                                        $query: query
                                                    }
                                                });
                                                // remove field from select clause
                                                const index = selectFields.findIndex((field) => {
                                                    return field.$name === `${selectView}.${mapping.childField}`;
                                                });
                                                if (index >= 0) {
                                                    selectFields.splice(index, 1);
                                                }
                                                return cb();
                                            });
                                        }).catch((err) => {
                                            return cb(err);
                                        });
                                    }).catch((err) => {
                                        return cb(err);
                                    })
                                    // remove json-like expression from expand clause of the current queryable to prevent the fetch execution
                                    // because the object will be fetched by the JSON sub-query in select clause
                                    const index = event.emitter.$expand.indexOf(expr);
                                    if (index >= 0) {
                                        event.emitter.$expand.splice(index, 1);
                                    }
                                } else {
                                    return cb();
                                }
                            } catch(error) {
                                return cb(error);
                            }
                        }, (err) => {
                            if (err) {
                                return callback(err);
                            }
                            return callback();
                        });
                    }
                    return callback();
                } catch (error) {
                    return callback(error);
                }
            });
        } catch (err) {
            return callback(err);
        }
    }
}

class OnBeforeGetExpandableTag {
    /**
     * @param {import('@themost/data').DataEventArgs} event
     * @param {function(err?:Error)} callback
     */
    beforeExecute(event, callback) {
        try {
            void supportsBeforeExecuteExpand(event, function (err, supported) {
                if (err) {
                    return callback(err);
                }
                try {
                    if (supported) {
                        const mappings = getBeforeExecuteMappings(event);
                        if (mappings.length === 0) {
                            return callback();
                        }
                        const {model} = event.emitter;
                        // get after execute listeners
                        const listeners = model.listeners('after.execute');
                        // and search for OnAfterGetExpandableObject listener to parse and format object that
                        // are going to be returned to the client by the current query execution using JSON-like queries
                        if (listeners.indexOf(OnAfterGetExpandableObject.prototype.beforeExecute) === -1) {
                            model.on('after.execute', OnAfterGetExpandableObject.prototype.afterExecute);
                        }
                        const { context } = model;
                        return eachSeries(mappings, (item, cb) => {
                            const { mapping, expr } = item;
                            // handle object tags (a collection of primitive values associated to a model)
                            if (mapping.associationType === 'junction' && mapping.childModel == null && mapping.parentModel === model.name) {
                                // get select query object name
                                const [selectView] = Object.keys(event.emitter.query.$select);
                                // get the view object of the current model
                                const { viewAdapter: ModelView } = model;
                                // get select fields of the current queryable
                                const selectFields = event.emitter.query.$select[selectView];
                                /**
                                 * get the property of the current model that is associated to the junction model by the current mapping
                                 * @type {import('@themost/data').DataObjectTag}
                                 */
                                const property = model.convert({}).property(mapping.refersTo);
                                // get the data model that holds the values of this association
                                const baseModel = property.getBaseModel();
                                // get the attribute of the current model that is associated to the junction model by the current mapping
                                const attribute = model.getAttribute(mapping.refersTo);
                                // if attribute type
                                if (attribute.type === 'Json' && attribute.additionalType !== 'null') {
                                    // upgrade base model
                                    void baseModel.migrateAsync().then(() => {
                                        const { viewAdapter: BaseView } = baseModel;
                                        const additionalModel = context.model(attribute.additionalType);
                                        const q = baseModel.asQueryable().select(
                                            ...additionalModel.attributes.map((attribute) => {
                                                return `${mapping.associationValueField}/${attribute.name} as ${attribute.name}`;
                                            })
                                        );
                                        const { query } = q.prepare();
                                        query.where(
                                            new QueryField(mapping.parentField).from(ModelView)
                                        ).equal(
                                            new QueryField(mapping.associationObjectField).from(BaseView)
                                        );
                                        selectFields.push({
                                            [mapping.refersTo]: {
                                                $jsonArray: [
                                                    query
                                                ]
                                            }
                                        });
                                        // remove json-like expression from expand clause of the current queryable to prevent the fetch execution
                                        // because the object will be fetched by the JSON sub-query in select clause
                                        const index = event.emitter.$expand.indexOf(expr);
                                        if (index >= 0) {
                                            event.emitter.$expand.splice(index, 1);
                                        }
                                        return cb();
                                    });
                                } else {
                                    // cannot expand non-json attribute
                                    return cb();
                                }
                            }
                            return cb();
                        }, (err) => {
                            if (err) {
                                return callback(err);
                            }
                            return callback();
                        });
                    }
                    return callback();
                } catch (error) {
                    return callback(error);
                }
            });
        } catch (err) {
            return callback(err);
        }
    }
}



class OnBeforeGetExpandableJunction {
    /**
     * @param {import('@themost/data').DataEventArgs} event
     * @param {function(err?:Error)} callback
     */
    beforeExecute(event, callback) {
        try {
            void supportsBeforeExecuteExpand(event, function (err, supported) {
                if (err) {
                    return callback(err);
                }
                try {
                    if (supported) {
                        const mappings = getBeforeExecuteMappings(event);
                        if (mappings.length === 0) {
                            return callback();
                        }
                        const {model} = event.emitter;
                        // get after execute listeners
                        const listeners = model.listeners('after.execute');
                        // and search for OnAfterGetExpandableObject listener to parse and format object that
                        // are going to be returned to the client by the current query execution using JSON-like queries
                        if (listeners.indexOf(OnAfterGetExpandableObject.prototype.beforeExecute) === -1) {
                            model.on('after.execute', OnAfterGetExpandableObject.prototype.afterExecute);
                        }
                        const { context } = model;
                        return eachSeries(mappings, (item, cb) => {
                            const { mapping, expr } = item;
                            // handle object tags (a collection of primitive values associated to a model)
                            if (mapping.associationType === 'junction' && mapping.childModel != null) {
                                // get select query object name
                                const [selectView] = Object.keys(event.emitter.query.$select);
                                // get the view object of the current model
                                const { viewAdapter: ModelView } = model;
                                // get select fields of the current queryable
                                const selectFields = event.emitter.query.$select[selectView];
                                /**
                                 * get the property of the current model that is associated to the junction model by the current mapping
                                 * @type {import('@themost/data').DataObjectTag}
                                 */
                                const property = model.convert({}).property(mapping.refersTo);
                                // get the data model that holds the values of this association
                                const baseModel = property.getBaseModel();
                                /**
                                 * @type {import('./data-model').DataModel}
                                 */
                                const additionalModel = mapping.childModel === model.name ?
                                    context.model(mapping.parentModel) :
                                    context.model(mapping.childModel);
                                // ensure that data objects exist
                                return baseModel.migrateAsync().then(() => {
                                    return additionalModel.migrateAsync()
                                }).then(() => {
                                    const options = mapping.options || {};
                                    void additionalModel.filterAsync(options).then((q) => {
                                        const { query } = q.prepare();
                                        // if select clause is not set, use queryable to select any field
                                        if (query.$select == null) {
                                            q.select();
                                        }
                                        // trigger a before execute event for making this procedure recursive
                                        const event = {
                                            model: additionalModel,
                                            emitter: q,
                                            target: null
                                        };
                                        return new Promise((resolve, reject) => {
                                            // execute before execute event for the parent model of the current association
                                            void new OnBeforeGetExpandableJunction().beforeExecute(event, (err) => {
                                                if (err) {
                                                    return reject(err);
                                                }
                                                resolve(q);
                                            });
                                        });
                                    }).then((q) => {
                                        const { viewAdapter: BaseView } = baseModel;
                                        const { query } = q.prepare();
                                        if (mapping.parentModel === model.name) {
                                            // join
                                            query.join(BaseView).with(
                                                new QueryExpression().where(
                                                    new QueryField(mapping.associationValueField).from(BaseView)
                                                ).equal(
                                                    new QueryField(mapping.childField).from(additionalModel.viewAdapter)
                                                )
                                            )
                                            query.where(
                                                new QueryField(mapping.parentField).from(ModelView)
                                            ).equal(
                                                new QueryField(mapping.associationObjectField).from(BaseView)
                                            );
                                        } else {
                                            // join
                                            query.join(BaseView).with(
                                                new QueryExpression().where(
                                                    new QueryField(mapping.associationObjectField).from(BaseView)
                                                ).equal(
                                                    new QueryField(mapping.parentField).from(additionalModel.viewAdapter)
                                                )
                                            )
                                            query.where(
                                                new QueryField(mapping.childField).from(ModelView)
                                            ).equal(
                                                new QueryField(mapping.associationValueField).from(BaseView)
                                            );
                                        }
                                        selectFields.push({
                                            [mapping.refersTo]: {
                                                $jsonArray: [
                                                    query
                                                ]
                                            }
                                        });
                                        // remove json-like expression from expand clause of the current queryable to prevent the fetch execution
                                        // because the object will be fetched by the JSON sub-query in select clause
                                        const index = event.emitter.$expand.indexOf(expr);
                                        if (index >= 0) {
                                            event.emitter.$expand.splice(index, 1);
                                        }
                                        return cb();
                                    });
                                });
                            }
                            return cb();
                        }, (err) => {
                            if (err) {
                                return callback(err);
                            }
                            return callback();
                        });
                    }
                    return callback();
                } catch (error) {
                    return callback(error);
                }
            });
        } catch (err) {
            return callback(err);
        }
    }
}

module.exports = {
    OnBeforeGetExpandableAssociation,
    OnBeforeGetExpandableJunction,
    OnBeforeGetExpandableTag
}
// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const _ = require('lodash');
const {QueryUtils, QueryEntity, QueryField} = require('@themost/query');
const {hasOwnProperty} = require('./has-own-property');

class DataMappingExtensions {
    /**
     * @param {DataAssociationMapping|*} mapping
     * @returns {*}
     */
    static extend(mapping) {
        let _queryable;
        let _childModel;
        let _parentModel;
        return {
            /**
             * @param {DataQueryable} dataQueryable
             */
            for: function(dataQueryable) {
                _queryable = dataQueryable;
                return this;
            },
            getChildModel: function() {
                if (_queryable == null) {
                    return;
                }
                if (_childModel != null) {
                    return _childModel;
                }
                // get child model
                _childModel = _queryable.model.context.model(mapping.childModel);
                // and return
                return _childModel;
            },
            getParentModel: function() {
                if (_queryable == null) {
                    return;
                }
                if (_parentModel != null) {
                    return _parentModel;
                }
                // get parent model
                _parentModel = _queryable.model.context.model(mapping.parentModel);
                // and return
                return _parentModel;
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getParents : function(items) {
                let thisArg = this;
                return new Promise(function(resolve, reject) {
                    if (items == null) {
                        return resolve();
                    }
                    let arr = Array.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return resolve();
                    }
                    if (_queryable == null) {
                        return reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.childModel !== _queryable.model.name) || (mapping.associationType!=='junction')) {
                        return resolve();
                    }
                    let HasParentJunction = require('./has-parent-junction').HasParentJunction;
                    let junction = new HasParentJunction(_queryable.model.convert({ }), mapping);
                    return junction.migrate(function(err) {
                        if (err) {
                            return reject(err);
                        }
                        let parentModel = thisArg.getParentModel();
                        parentModel.filter(mapping.options, function(err, q) {
                            if (err) {
                                return reject(err);
                            }
                            // clone queryable
                            const subQuery = _queryable.clone().select(mapping.childField).query.as('j0');
                            //get junction sub-query
                            let junctionQuery = QueryUtils.query(junction.getBaseModel().name).select([mapping.associationObjectField, mapping.associationValueField])
                                .join(subQuery)
                                .with(QueryUtils.where(new QueryEntity(junction.getBaseModel().name).select(mapping.associationValueField))
                                    .equal(new QueryEntity('j0').select(mapping.childField)));
                            if (!q.query.hasFields()) {
                                q.select();
                            }
                            //append join statement with sub-query
                            q.query.join(junctionQuery.as('g0'))
                                .with(QueryUtils.where(new QueryEntity(parentModel.viewAdapter).select(mapping.parentField))
                                    .equal(new QueryEntity('g0').select(mapping.associationObjectField)));
                            //inherit silent mode
                            if (_queryable.$silent)  {
                                q.silent();
                            }
                            //append child key field
                            const addField = QueryField.select(mapping.associationValueField).from('g0').as('__ref__');
                            const selectFields = q.query.$select[parentModel.viewAdapter];
                            selectFields.push(addField);
                            return q.getItems().then(function (parents) {
                                arr.forEach(function(x) {
                                    x[mapping.refersTo] = parents.filter(function(y) {
                                        if (y['__ref__'] === x[mapping.childField]) {
                                            delete y['__ref__'];
                                            return true;
                                        }
                                        return false;
                                    });
                                });
                                return resolve();
                            }).catch(function (err) {
                                return reject(err);
                            });
                        });
                    });
                });
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getChildren: function(items) {
                let thisArg = this;
                return new Promise(function(resolve, reject) {
                    if (items == null) {
                        return resolve();
                    }
                    let arr = Array.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return resolve();
                    }
                    if (_queryable == null) {
                        return reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.parentModel !== _queryable.model.name) || (mapping.associationType!=='junction')) {
                        return resolve();
                    }
                    let DataObjectJunction = require('./data-object-junction').DataObjectJunction;
                    let junction = new DataObjectJunction(_queryable.model.convert({ }), mapping);
                    return junction.migrate(function(err) {
                        if (err) {
                            return reject(err);
                        }
                        let childModel = thisArg.getChildModel();
                        childModel.filter(mapping.options, function(err, q) {
                            if (err) {
                                return reject(err);
                            }
                            if (!q.query.hasFields()) {
                                q.select();
                            }
                            // clone queryable
                            const subQuery = _queryable.clone().select(mapping.parentField).query.as('j0');
                            //get junction sub-query
                            let junctionQuery = QueryUtils.query(junction.getBaseModel().name).select([mapping.associationObjectField, mapping.associationValueField])
                                .join(subQuery)
                                .with(QueryUtils.where(new QueryEntity(junction.getBaseModel().name).select(mapping.associationObjectField))
                                    .equal(new QueryEntity('j0').select(mapping.parentField)));
                            //append join statement with sub-query
                            q.query.join(junctionQuery.as('g0'))
                                .with(QueryUtils.where(new QueryEntity(childModel.viewAdapter).select(mapping.childField))
                                    .equal(new QueryEntity('g0').select(mapping.associationValueField)));

                            //inherit silent mode
                            if (_queryable.$silent)  {
                                q.silent();
                            }
                            //append item reference
                            const addField = QueryField.select(mapping.associationObjectField).from('g0').as('__ref__');
                            const selectFields = q.query.$select[childModel.viewAdapter];
                            selectFields.push(addField);
                            return q.getItems().then(function (childs) {
                                arr.forEach(function(x) {
                                    x[mapping.refersTo] = childs.filter(function(y) {
                                        if (y['__ref__'] === x[mapping.parentField]) {
                                            delete y['__ref__'];
                                            return true;
                                        }
                                        return false;
                                    });
                                });
                                return resolve();
                            }).catch(function(err) {
                                return reject(err);
                            });
                        });
                    });
                });
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getAssociatedParents: function(items) {
                let thisArg = this;
                return new Promise(function(resolve, reject) {
                    if (items == null) {
                        return resolve();
                    }
                    let arr = Array.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return resolve();
                    }
                    if (_queryable == null) {
                        return reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.childModel !== _queryable.model.name) || (mapping.associationType!=='association')) {
                        return resolve();
                    }
                    thisArg.getParentModel().migrate(function(err) {
                        if (err) {
                            return reject(err);
                        }
                        thisArg.getParentModel().filter(mapping.options, function(err, q) {
                            if (err) {
                                return reject(err);
                            }
                            //Important Backward compatibility issue (<1.8.0)
                            //Description: if $levels parameter is not defined then set the default value to 0.
                            if (typeof q.$levels === 'undefined') {
                                q.$levels = 0;
                            }
                            if (typeof q.query.$select === 'undefined') {
                                q.select();
                            }
                            const subQuery = _queryable.clone().select(mapping.childField).query.as('j0');
                            q.query
                                .distinct(true)
                                .join(subQuery)
                                .with(QueryUtils.where(new QueryEntity(thisArg.getParentModel().viewAdapter).select(mapping.parentField))
                                    .equal(new QueryEntity('j0').select(mapping.childField)));
                            //inherit silent mode
                            if (_queryable.$silent)  {
                                q.silent();
                            }
                            q.silent().getAllItems().then(function(parents) {
                                let childField = _queryable.model.field(mapping.childField);
                                let keyField = childField.property || childField.name;
                                let iterator = function(x) {
                                    let key = x[keyField];
                                    x[keyField] = parents.find(function(x) {
                                        return x[mapping.parentField] === key;
                                    });
                                };
                                arr.forEach(iterator);
                                return resolve();
                            }).catch(function (err) {
                                return reject(err);
                            });
                        });
                    });
                });
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getAssociatedChildren: function(items) {
                let thisArg = this;
                return new Promise(function(resolve, reject) {
                    if (items == null) {
                        return resolve();
                    }
                    let arr = Array.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return resolve();
                    }
                    if (_queryable == null) {
                        return reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.parentModel !== _queryable.model.name) || (mapping.associationType!=='association')) {
                        return resolve();
                    }
                    thisArg.getChildModel().migrate(function(err) {
                        if (err) {
                            return reject(err);
                        }
                        let parentField = thisArg.getParentModel().field(mapping.parentField);
                        if (parentField == null) {
                            return reject('The specified field cannot be found on parent model');
                        }
                        let keyField = parentField.property || parentField.name;
                        let values = _.intersection(_.map(_.filter(arr, function(x) {
                            return hasOwnProperty(x, keyField);
                        }), function (x) {
                            return x[keyField];
                        }));
                        if (values.length===0) {
                            return resolve();
                        }
                        //search for view named summary
                        thisArg.getChildModel().filter(mapping.options, function(err, q) {
                            if (err) {
                                return reject(err);
                            }
                            let childField = thisArg.getChildModel().field(mapping.childField);
                            if (childField == null) {
                                return reject('The specified field cannot be found on child model');
                            }
                            let foreignKeyField = childField.property || childField.name;
                            if (typeof q.$levels === 'undefined') {
                                q.$levels = 0;
                            }
                            if (!q.query.hasFields()) {
                                q.select();
                            }
                            //inherit silent mode
                            if (_queryable.$silent)  {
                                q.silent();
                            }
                            //join parents
                            const subQuery = _queryable.clone().select(mapping.parentField).query.as('j0');
                            q.query.join(subQuery)
                                .with(QueryUtils.where(new QueryEntity(thisArg.getChildModel().viewAdapter).select(mapping.childField))
                                    .equal(new QueryEntity('j0').select(mapping.parentField)));
                            q.prepare();
                            //final execute query
                            return q.getItems().then(function(childs) {
                                arr.forEach(function(x) {
                                    x[mapping.refersTo] = childs.filter(function(y) {
                                        const foreignKeyValue = y[foreignKeyField];
                                        if (foreignKeyValue != null && hasOwnProperty(foreignKeyValue, keyField)) {
                                            return foreignKeyValue[keyField] === x[keyField];
                                        }
                                        return y[foreignKeyField] === x[keyField];
                                    });
                                });
                                return resolve();
                            }).catch(function(err) {
                                return resolve(err);
                            });
                        });
                    });
                });
            }
        };
    }
}

module.exports = {
    DataMappingExtensions
};

// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
/*eslint no-var: "off"*/
// noinspection ES6ConvertVarToLetConst

var _ = require('lodash');
var {QueryUtils, QueryExpression} = require('@themost/query');
var {QueryEntity} = require('@themost/query');
var {QueryField} = require('@themost/query');
var Q = require('q');
var {hasOwnProperty} = require('./has-own-property');

class DataMappingExtender {
    constructor(mapping) {
        this.mapping = mapping;
    }
    /**
     * @param {DataQueryable} queryable 
     * @returns 
     */
    for(queryable) {
        this.queryable = queryable;
        return this;
    }

    getChildModel() {
        if (this.queryable == null) {
            return;
        }
        if (this._childModel != null) {
            return this._childModel;
        }
        this._childModel = this.queryable.model.context.model(this.mapping.childModel);
        return this._childModel;
    }

    getParentModel() {
        if (this.queryable == null) {
            return;
        }
        if (this._parentModel != null) {
            return this._parentModel;
        }
        this._parentModel = this.queryable.model.context.model(this.mapping.parentModel);
        return this._parentModel;
    }

    /**
     * @param {*} items
     * @returns {Promise|*}
     */
    getParents(items) {
        var thisArg = this;
        var isSilent = false;
        var thisQueryable = this.queryable;
        var mapping = this.mapping;
        return new Promise(function(resolve, reject) {
            if (_.isNil(items)) {
                return resolve();
            }
            var arr = _.isArray(items) ? items : [items];
            if (arr.length === 0) {
                return resolve();
            }
            if (_.isNil(thisQueryable)) {
                return reject('The underlying data queryable cannot be empty at this context.');
            }
            if ((mapping.childModel !== thisQueryable.model.name) || (mapping.associationType!=='junction')) {
                return resolve();
            }
            //get array of key values (for childs)
            var values = arr.filter(function(x) {
                return (typeof x[mapping.childField]!=='undefined')
                    && (x[mapping.childField]!=null); })
                    .map(function(x) { return x[mapping.childField]
                    });
            //query junction model
            var HasParentJunction = require('./has-parent-junction').HasParentJunction;
            var junction = new HasParentJunction(thisQueryable.model.convert({ }), mapping);
            isSilent = !!thisQueryable.$silent;
            junction.getBaseModel().where(mapping.associationValueField).in(values).flatten().silent(isSilent).all(function(err, junctions) {
                if (err) {
                    return reject(err);
                }
                //get array of parent key values
                values = _.intersection(junctions.map(function(x) { return x[mapping.associationObjectField] }));
                //get parent model
                var parentModel = thisArg.getParentModel();
                //query parent with parent key values
                parentModel.filter(mapping.options, function(err, q) {
                    if (err) {
                        return reject(err);
                    }
                    q.prepare();
                    //Important Backward compatibility issue (<1.8.0)
                    //Description: if $levels parameter is not defined then set the default value to 0.
                    if (typeof q.$levels === 'undefined') {
                        q.$levels = 0;
                    }
                    q.where(mapping.parentField).in(values);
                    //inherit silent mode
                    if (thisQueryable.$silent)  {
                        q.silent();
                    }
                    if (q.query.hasFields() === false) {
                        q.select();
                    }
                    var parentField = thisArg.getParentModel().getAttribute(mapping.parentField);
                    var keyField = parentField.property || parentField.name;
                    // if query is a select statement
                    if (q.query.$fixed == null) {
                        // check if foreign key field exists in query
                        var selectEntity = q.model.viewAdapter;
                        if (Object.prototype.hasOwnProperty.call(q.query.$select, selectEntity)) {
                            /**
                             * @type {Array}
                             */
                            var select = Object.getOwnPropertyDescriptor(q.query.$select, selectEntity).value;
                            // find foreign key key
                            var find =  select.find(function(field) {
                                if (field instanceof QueryField) {
                                    // by alias or name
                                    return field.as() === keyField || field.getName() === keyField;
                                }
                            });
                            // if foreign key field does not exist
                            if (find == null) {
                                // clone query
                                var q1 = q.clone().select(keyField);
                                // and select foreign key field
                                var select1 = Object.getOwnPropertyDescriptor(q1.query.$select, selectEntity).value;
                                if (Array.isArray(select1)) {
                                    // append field to select fields
                                    select.push.apply(select, select1);
                                }
                            }
                        }
                    }
                    //and finally query parent
                    q.getItems().then(function(parents){
                        //if result contains only one item
                        if (arr.length === 1) {
                            arr[0][mapping.refersTo] = parents;
                            return resolve();
                        }
                        //otherwise loop result array
                        arr.forEach(function(x) {
                            //get child (key value)
                            var childValue = x[mapping.childField];
                            //get parent(s)
                            var p = junctions.filter(function(y) { return (y[mapping.associationValueField]===childValue); }).map(function(r) { return r[mapping.associationObjectField]; });
                            //filter data and set property value (a filtered array of parent objects)
                            x[mapping.refersTo] = parents.filter(function(z) { return p.indexOf(z[mapping.parentField])>=0; });
                        });
                        return resolve();
                    }).catch(function(err) {
                        return reject(err);
                    });
                });
            });
        });
    }

    /**
     * @param {*} items
     * @returns {Promise|*}
     */
     getChildren(items) {
        var thisArg = this;
        var isSilent = false;
        var thisQueryable = this.queryable;
        var mapping = this.mapping;
        return new Promise(function(resolve, reject) {
            if (_.isNil(items)) {
                return resolve();
            }
            var arr = _.isArray(items) ? items : [items];
            if (arr.length === 0) {
                return resolve();
            }
            if (_.isNil(thisQueryable)) {
                return reject('The underlying data queryable cannot be empty at this context.');
            }
            if ((mapping.parentModel !== thisQueryable.model.name) || (mapping.associationType!=='junction')) {
                return resolve();
            }
            var values = arr.filter(function(x) {
                return (typeof x[mapping.parentField]!=='undefined') && (x[mapping.parentField]!=null);
            }).map(function(x) {
                return x[mapping.parentField];
            });
            if (_.isNil(mapping.childModel)) {
                var DataObjectTag = require('./data-object-tag').DataObjectTag;
                junction = new DataObjectTag(thisQueryable.model.convert({ }), mapping);
                var objectField = junction.getObjectField();
                var valueField = junction.getValueField();
                isSilent = !!thisQueryable.$silent;
                return junction.getBaseModel().where(objectField).in(values).flatten().silent(isSilent).select(objectField, valueField).all().then(function(items) {
                    arr.forEach(function(x) {
                        x[mapping.refersTo] = items.filter(function(y) {
                            return y[objectField]===x[mapping.parentField];
                        }).map(function (y) {
                            return y[valueField];
                        });
                    });
                    return resolve();
                }).catch(function (err) {
                    return reject(err);
                });
            }
            //create a dummy object
            var DataObjectJunction = require('./data-object-junction').DataObjectJunction;
            var junction = new DataObjectJunction(thisQueryable.model.convert({ }), mapping);
            //query junction model
            isSilent = !!thisQueryable.$silent;
            return junction.getBaseModel().where(mapping.associationObjectField).in(values).silent(isSilent).flatten().getItems().then(function(junctions) {
                //get array of child key values
                var values = junctions.map(function(x) { return x[mapping.associationValueField] });
                //get child model
                var childModel = thisArg.getChildModel();
                childModel.filter(mapping.options, function(err, q) {
                    if (err) {
                        return reject(err);
                    }
                    q.prepare();
                    //Important Backward compatibility issue (<1.8.0)
                    //Description: if $levels parameter is not defined then set the default value to 0.
                    if (typeof q.$levels === 'undefined') {
                        q.$levels = 0;
                    }
                    if (q.query.hasFields() === false) {
                        q.select();
                    }
                    //inherit silent mode
                    if (thisQueryable.$silent)  {
                        q.silent();
                    }

                    var childField = thisArg.getChildModel().getAttribute(mapping.childField);
                    var keyField = childField.property || childField.name;
                    // if query is a select statement
                    if (q.query.$fixed == null) {
                        // check if foreign key field exists in query
                        var selectEntity = q.model.viewAdapter;
                        if (Object.prototype.hasOwnProperty.call(q.query.$select, selectEntity)) {
                            /**
                             * @type {Array}
                             */
                            var select = Object.getOwnPropertyDescriptor(q.query.$select, selectEntity).value;
                            // find foreign key key
                            var find =  select.find(function(field) {
                                if (field instanceof QueryField) {
                                    // by alias or name
                                    return field.as() === keyField || field.getName() === keyField;
                                }
                            });
                            // if foreign key field does not exist
                            if (find == null) {
                                // clone query
                                var q1 = q.clone().select(keyField);
                                // and select foreign key field
                                var select1 = Object.getOwnPropertyDescriptor(q1.query.$select, selectEntity).value;
                                if (Array.isArray(select1)) {
                                    // append field to select fields
                                    select.push.apply(select, select1);
                                }
                            }
                        }
                    }

                    //append where statement for this operation
                    if (values.length===1) {
                        q.where(mapping.childField).equal(values[0]);
                    }
                    else {
                        q.where(mapping.childField).in(values);
                    }
                    //and finally query childs
                    var refersTo = thisQueryable.model.getAttribute(mapping.refersTo);
                    q.getItems().then(function(childs) {
                        //if result contains only one item
                        if (arr.length === 1) {
                            if (refersTo && (refersTo.multiplicity === 'ZeroOrOne' || refersTo.multiplicity === 'One')) {
                                arr[0][mapping.refersTo] = childs[0] != null ? childs[0] : null;
                                return resolve();
                            }
                            arr[0][mapping.refersTo] = childs;
                            return resolve();
                        }
                        //otherwise loop result array
                        arr.forEach(function(x) {
                            //get parent (key value)
                            var parentValue = x[mapping.parentField];
                            //get parent(s)
                            var p = junctions.filter(function(y) { return (y[mapping.associationObjectField]===parentValue); }).map(function(r) { return r[mapping.associationValueField]; });
                            //filter data and set property value (a filtered array of parent objects)
                            if (refersTo && (refersTo.multiplicity === 'ZeroOrOne' || refersTo.multiplicity === 'One')) {
                                // get only one child
                                x[mapping.refersTo] = childs.find(function(z) { 
                                    return p.indexOf(z[mapping.childField])>=0; 
                                });
                            } else {
                                x[mapping.refersTo] = childs.filter(function(z) { 
                                    return p.indexOf(z[mapping.childField])>=0; 
                                });
                            }
                            
                        });
                        return resolve();
                    }).catch(function(err) {
                        return reject(err);
                    });
                });
            }).catch(function (err) {
                return reject(err);
            });
        });
    }

    /**
     * @param {*} items
     * @returns {Promise|*}
     */
     getAssociatedParents(items) {
        var thisArg = this;
        var thisQueryable = this.queryable;
        var mapping = this.mapping;
        return new Promise(function(resolve, reject) {
            if (_.isNil(items)) {
                return resolve();
            }
            var arr = _.isArray(items) ? items : [items];
            if (arr.length === 0) {
                return resolve();
            }
            if (_.isNil(thisQueryable)) {
                return reject('The underlying data queryable cannot be empty at this context.');
            }
            if ((mapping.childModel !== thisQueryable.model.name) || (mapping.associationType!=='association')) {
                return resolve();
            }
            thisArg.getParentModel().migrate(function(err) {
                if (err) { return reject(err); }
                var childField = thisQueryable.model.field(mapping.childField);
                var keyField = childField.property || childField.name;
                if (_.isNil(childField)) {
                    return reject('The specified field cannot be found on child model');
                }
                var values = _.intersection(_.map(_.filter(arr, function(x) {
                    return hasOwnProperty(x, keyField);
                    }), function (x) { return x[keyField];}));
                if (values.length===0) {
                    return resolve();
                }
                thisArg.getParentModel().filter(mapping.options, function(err, q) {
                    if (err) {
                        return reject(err);
                    }
                    q.prepare();
                    //Important Backward compatibility issue (<1.8.0)
                    //Description: if $levels parameter is not defined then set the default value to 0.
                    if (typeof q.$levels === 'undefined') {
                        q.$levels = 0;
                    }
                    //inherit silent mode
                    if (thisQueryable.$silent)  { q.silent(); }
                    //append where statement for this operation
                    q.where(mapping.parentField).in(values);
                    //set silent (?)
                    if (childField && childField.nested === true) {
                        q.silent();
                    }
                    q.getAllItems().then(function(parents) {
                        var key=null,
                            selector = function(x) {
                                return x[mapping.parentField]===key;
                            },
                            iterator = function(x) {
                                key = x[keyField];
                                if (childField.property && childField.property!==childField.name) {
                                    x[childField.property] = parents.filter(selector)[0];
                                    delete x[childField.name];
                                }
                                else
                                    x[childField.name] = parents.filter(selector)[0];
                            };
                        if (_.isArray(arr)) {
                            arr.forEach(iterator);
                        }
                        return resolve();
                    }).catch(function(err) {
                        return reject(err);
                    });
                });
            });
        });
    }

    /**
     * @param {*} items
     * @returns {Promise|*}
     */
     getAssociatedChildren(items) {
        var thisArg = this;
        var thisQueryable = this.queryable;
        var mapping = this.mapping;
        return new Promise(function(resolve, reject) {
            if (_.isNil(items)) {
                return resolve();
            }
            var arr = _.isArray(items) ? items : [items];
            if (arr.length === 0) {
                return resolve();
            }
            if (_.isNil(thisQueryable)) {
                return reject('The underlying data queryable cannot be empty at this context.');
            }
            if ((mapping.parentModel !== thisQueryable.model.name) || (mapping.associationType!=='association')) {
                return resolve();
            }
            thisArg.getChildModel().migrate(function(err) {
                if (err) { return reject(err); }
                var parentField = thisQueryable.model.field(mapping.parentField);
                if (_.isNil(parentField)) {
                    return reject('The specified field cannot be found on parent model');
                }
                var keyField = parentField.property || parentField.name;
                var values = _.intersection(_.map(_.filter(arr, function(x) {
                    return hasOwnProperty(x, keyField);
                }), function (x) { return x[keyField];}));
                if (values.length===0) {
                    return resolve();
                }
                //search for view named summary
                thisArg.getChildModel().filter(mapping.options, function(err, q) {
                    if (err) {
                        return reject(err);
                    }
                    var childField = thisArg.getChildModel().field(mapping.childField);
                    if (_.isNil(childField)) {
                        return reject('The specified field cannot be found on child model');
                    }
                    var foreignKeyField = childField.property || childField.name;
                    //Important Backward compatibility issue (<1.8.0)
                    //Description: if $levels parameter is not defined then set the default value to 0.
                    if (typeof q.$levels === 'undefined') {
                        q.$levels = 0;
                    }
                    q.prepare();
                    if (values.length===1) {
                        q.where(mapping.childField).equal(values[0]);
                    }
                    else {
                        q.where(mapping.childField).in(values);
                    }
                    if (q.query.hasFields() === false) {
                        q.select();
                    }
                    //inherit silent mode
                    if (thisQueryable.$silent)  {
                        q.silent();
                    }

                    // if query is a select statement
                    if (q.query.$fixed == null) {
                        // check if foreign key field exists in query
                        var selectEntity = q.model.viewAdapter;
                        if (Object.prototype.hasOwnProperty.call(q.query.$select, selectEntity)) {
                            /**
                             * @type {Array}
                             */
                            var select = Object.getOwnPropertyDescriptor(q.query.$select, selectEntity).value;
                            // find foreign key key
                            var find =  select.find(function(field) {
                                if (field instanceof QueryField) {
                                    // by alias or name
                                    return field.as() === foreignKeyField || field.getName() === foreignKeyField;
                                }
                            });
                            // if foreign key field does not exist
                            if (find == null) {
                                // clone query
                                var q1 = q.clone().select(foreignKeyField);
                                // and select foreign key field
                                var select1 = Object.getOwnPropertyDescriptor(q1.query.$select, selectEntity).value;
                                if (Array.isArray(select1)) {
                                    // append field to select fields
                                    select.push.apply(select, select1);
                                }
                                if (Array.isArray(q.query.$group)) {
                                    find =  q.query.$group.find(function(field) {
                                        if (field instanceof QueryField) {
                                            // by alias or name
                                            return field.as() === foreignKeyField || field.getName() === foreignKeyField;
                                        }
                                    });
                                    if (find == null) {
                                        q.query.$group.push.apply(q.query.$group, select1);
                                    }
                                }
                            }
                        }
                    }

                    //final execute query
                    return q.getItems().then(function(childs) {
                        // get referrer field of parent model
                        var refersTo = thisArg.getParentModel().getAttribute(mapping.refersTo);
                        _.forEach(arr, function(x) {
                            var items = _.filter(childs, function(y) {
                                if (!_.isNil(y[foreignKeyField]) && hasOwnProperty(y[foreignKeyField], keyField)) {
                                    return y[foreignKeyField][keyField] === x[keyField];
                                }
                                return y[foreignKeyField] === x[keyField];
                            });
                            // if parent field multiplicity attribute defines an one-to-one association
                            if (refersTo && (refersTo.multiplicity === 'ZeroOrOne' || refersTo.multiplicity === 'One')) {
                                if (items[0] != null) {
                                    // todo raise error if there are more than one items
                                    // get only the first item
                                    x[mapping.refersTo] = items[0];
                                }
                                else {
                                    // or nothing
                                    x[mapping.refersTo] = null;
                                }
                            }
                            else {
                                // otherwise get all items
                                x[mapping.refersTo] = items;
                            }
                        });
                        return resolve();
                    }).catch(function(err) {
                        return resolve(err);
                    });
                });
            });
        });
    }
}

class DataMappingOptimizedExtender extends DataMappingExtender {
    constructor(mapping) {
        super(mapping);
    }

    /**
     * @param {*} items
     * @returns {Promise|*}
     */
     getParents(items) {
        var thisArg = this;
        var thisQueryable = this.queryable;
        var mapping = this.mapping;
        return new Promise(function(resolve, reject) {
            if (items == null) {
                return resolve();
            }
            var arr = Array.isArray(items) ? items : [ items ];
            if (arr.length === 0) {
                return resolve();
            }
            if (_.isNil(thisQueryable)) {
                return reject('The underlying data queryable cannot be empty at this context.');
            }
            
            if ((mapping.childModel !== thisQueryable.model.name) || (mapping.associationType!=='junction')) {
                return resolve();
            }
            var HasParentJunction = require('./has-parent-junction').HasParentJunction;
            var junction = new HasParentJunction(thisQueryable.model.convert({ }), mapping);
            return junction.migrate(function(err) {
                if (err) {
                    return reject(err);
                }
                var parentModel = thisArg.getParentModel();
                parentModel.filter(mapping.options, function(err, q) {
                    if (err) {
                        return reject(err);
                    }
                    if (!q.query.hasFields()) {
                        q.select();
                    }
                    //get junction sub-query
                    var junctionQuery = QueryUtils.query(junction.getBaseModel().name).select([mapping.associationObjectField, mapping.associationValueField])
                        .join(thisQueryable.query.as('j0'))
                        .with(QueryUtils.where(new QueryEntity(junction.getBaseModel().name).select(mapping.associationValueField))
                            .equal(new QueryEntity('j0').select(mapping.childField)));
                    //append join statement with sub-query
                    q.query.join(junctionQuery.as('g0'))
                        .with(QueryUtils.where(new QueryEntity(parentModel.viewAdapter).select(mapping.parentField))
                            .equal(new QueryEntity('g0').select(mapping.associationObjectField)));
                    if (!q.query.hasFields()) {
                        q.select();
                    }
                    //inherit silent mode
                    if (thisQueryable.$silent)  {
                        q.silent();
                    }
                    // append child key field
                    if (hasOwnProperty(q.query.$select, q.model.viewAdapter)) {
                        const select =  Object.getOwnPropertyDescriptor(q.query.$select, q.model.viewAdapter).value;
                        select.push(QueryField.select(mapping.associationValueField).from('g0').as('__ref'));
                    } else {
                        throw new Error('Query expression is invalid. Expected a collection of selected attributes');
                    }
                    //append child key field
                    return q.getItems().then(function (parents) {
                        _.forEach(arr, function(item) {
                            var values = parents.filter(function(parent) {
                                if (parent.__ref === item[mapping.childField]) {
                                    return true;
                                }
                                return false;
                            });
                            var cloned = _.cloneDeep(values);
                            cloned.forEach(function(item1) {
                                delete item1.__ref; 
                            });
                            item[mapping.refersTo] = cloned;
                        });
                        return resolve();
                    }).catch(function (err) {
                        return reject(err);
                    });
                });
            });
        });
    }

    /**
     * @param {*} items
     * @returns {Promise|*}
     */
    getChildren(items) {
        var thisArg = this;
        var thisQueryable = this.queryable;
        var mapping = this.mapping;
        return new Promise(function(resolve, reject) {
            if (items == null) {
                return resolve();
            }
            var arr = Array.isArray(items) ? items : [ items ];
            if (arr.length === 0) {
                return resolve();
            }
            if (thisQueryable == null) {
                return reject('The underlying data queryable cannot be empty at this context.');
            }
            if ((mapping.parentModel !== thisQueryable.model.name) || (mapping.associationType!=='junction')) {
                return resolve();
            }
            var junction;
            if (mapping.childModel == null) {
                var DataObjectTag = require('./data-object-tag').DataObjectTag;
                junction = new DataObjectTag(thisQueryable.model.convert({ }), mapping);
                return junction.migrate(function(err) {
                    if (err) {
                        return reject(err);
                    }
                    //get junction sub-query
                    var q = junction.getBaseModel()
                        .select(mapping.associationObjectField, mapping.associationValueField);
                    q.query.join(thisQueryable.query.as('j0'))
                        .with(QueryUtils.where(new QueryEntity(junction.getBaseModel().name).select(mapping.associationObjectField))
                            .equal(new QueryEntity('j0').select(mapping.parentField)));
                    if (thisQueryable.$silent)  {
                        q.silent();
                    }
                    return q.getItems().then(function (children) {
                        arr.forEach(function(item) {
                             var values = children.filter(function(child) {
                                if (child[mapping.associationObjectField] === item[mapping.parentField]) {
                                    return true;
                                }
                                return false;
                            });
                            var cloned = _.cloneDeep(values);
                            item[mapping.refersTo] = cloned.map(function(item) {
                                return item[mapping.associationValueField];
                            });
                        });
                        return resolve();
                    }).catch(function (err) {
                        return reject(err);
                    });
                });
            }
            var DataObjectJunction = require('./data-object-junction').DataObjectJunction;
            junction = new DataObjectJunction(thisQueryable.model.convert({ }), mapping);
            return junction.migrate(function(err) {
                if (err) {
                    return reject(err);
                }
                var childModel = thisArg.getChildModel();
                childModel.filter(mapping.options, function(err, q) {
                    if (err) {
                        return reject(err);
                    }
                    if (!q.query.hasFields()) {
                        q.select();
                    }
                    //get junction sub-query
                    var junctionQuery = QueryUtils.query(junction.getBaseModel().name).select([mapping.associationObjectField, mapping.associationValueField])
                        .join(thisQueryable.query.as('j0'))
                        .with(QueryUtils.where(new QueryEntity(junction.getBaseModel().name).select(mapping.associationObjectField))
                            .equal(new QueryEntity('j0').select(mapping.parentField)));
                    //append join statement with sub-query
                    q.query.join(junctionQuery.as('g0'))
                        .with(QueryUtils.where(new QueryEntity(childModel.viewAdapter).select(mapping.childField))
                            .equal(new QueryEntity('g0').select(mapping.associationValueField)));

                    //inherit silent mode
                    if (thisQueryable.$silent)  {
                        q.silent();
                    }
                    // append item reference
                    if (hasOwnProperty(q.query.$select, q.model.viewAdapter)) {
                        const select =  Object.getOwnPropertyDescriptor(q.query.$select, q.model.viewAdapter).value;
                        select.push(QueryField.select(mapping.associationObjectField).from('g0').as('__ref'));
                    } else {
                        throw new Error('Query expression is invalid. Expected a collection of selected attributes');
                    }
                    return q.getItems().then(function (children) {
                        arr.forEach(function(item) {
                             var values = children.filter(function(child) {
                                 // important:: use type equal operator
                                if (child.__ref === item[mapping.parentField]) {
                                    return true;
                                }
                                return false;
                            });
                            var cloned = _.cloneDeep(values);
                            cloned.forEach(function(item1) {
                                delete item1.__ref;
                            });
                            item[mapping.refersTo] = cloned;
                        });
                        return resolve();
                    }).catch(function (err) {
                        return reject(err);
                    });
                });
            });
        });
    }
    /**
     * @param {*} items
     * @returns {Promise|*}
     */
    getAssociatedParents(items) {
        var thisArg = this;
        var thisQueryable = this.queryable;
        var mapping = this.mapping;
        return new Promise(function(resolve, reject) {
            if (items == null) {
                return resolve();
            }
            var arr = Array.isArray(items) ? items : [items];
            if (arr.length === 0) {
                return resolve();
            }
            if (thisQueryable == null) {
                return reject('The underlying data queryable cannot be empty at this context.');
            }
            if ((mapping.childModel !== thisQueryable.model.name) || (mapping.associationType!=='association')) {
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
                    if (q.$levels == null) {
                        q.$levels = 0;
                    }
                    if (q.query.$select == null) {
                       q.select();
                    }
                    var childField = thisQueryable.model.field(mapping.childField);
                    var keyField = childField.property || childField.name;
                    // if query is a select statement
                    if (thisQueryable.query.$fixed == null) {
                        // check if foreign key field exists in query
                        var selectEntity = thisQueryable.model.viewAdapter;
                        if (Object.prototype.hasOwnProperty.call(thisQueryable.query.$select, selectEntity)) {
                            /**
                             * @type {Array}
                             */
                            var select = Object.getOwnPropertyDescriptor(thisQueryable.query.$select, selectEntity).value;
                            // find foreign key key
                            var find =  select.find(function(field) {
                                if (field instanceof QueryField) {
                                    // by alias or name
                                    return field.as() === keyField || field.getName() === keyField;
                                }
                            });
                            // if foreign key field does not exist
                            if (find == null) {
                                // clone query
                                var q1 = thisQueryable.clone().select(keyField);
                                // and select foreign key field
                                var select1 = Object.getOwnPropertyDescriptor(q1.query.$select, selectEntity).value;
                                if (Array.isArray(select1)) {
                                    // append field to select fields
                                    select.push.apply(select, select1);
                                }
                            }
                        }
                    }

                    q.query
                       .join(thisQueryable.query.as('j0'))
                       .with(QueryUtils.where(new QueryEntity(thisArg.getParentModel().viewAdapter).select(mapping.parentField))
                           .equal(new QueryEntity('j0').select(mapping.childField)));
                    //inherit silent mode
                    if (thisQueryable.$silent)  {
                        q.silent();
                    }
                    var refersTo = thisArg.getChildModel().getAttribute(mapping.childField);
                    if (refersTo.nested === true) {
                        q.silent();
                    }
                    // validate nested attribute
                    q.getAllItems().then(function(results) {
                        var iterator = function(item) {
                            var find = results.find(function(result) {
                               return result[mapping.parentField] == item[keyField];
                            });
                            item[keyField] = _.cloneDeep(find);
                        };
                        arr.forEach(iterator);
                        return resolve();
                    }).catch(function (err) {
                        return reject(err);
                    });
                });
            });
        });
    }

    /**
     * @param {*} items
     * @returns {Promise|*}
     */
    getAssociatedChildren(items) {
        var thisArg = this;
        var thisQueryable = this.queryable;
        var mapping = this.mapping;
        return new Promise(function(resolve, reject) {
            if (items == null) {
                return resolve();
            }
            var arr = Array.isArray(items) ? items : [items];
            if (arr.length === 0) {
                return resolve();
            }
            if (thisQueryable == null) {
                return reject('The underlying data queryable cannot be empty at this context.');
            }
            if ((mapping.parentModel !== thisQueryable.model.name) || (mapping.associationType!=='association')) {
                return resolve();
            }
            thisArg.getChildModel().migrate(function(err) {
                if (err) { 
                    return reject(err);
                }
                var parentField = thisArg.getParentModel().field(mapping.parentField);
                if (parentField == null) {
                    return reject('The specified field cannot be found on parent model');
                }
                var keyField = parentField.property || parentField.name;
                var values = _.intersection(_.map(_.filter(arr, function(x) {
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
                    var childField = thisArg.getChildModel().field(mapping.childField);
                    if (childField == null) {
                        return reject('The specified field cannot be found on child model');
                    }
                    var foreignKeyField = childField.property || childField.name;
                    //Important Backward compatibility issue (<1.8.0)
                    //Description: if $levels parameter is not defined then set the default value to 0.
                    if (q.$levels == null) {
                        q.$levels = 0;
                    }
                    if (q.query.hasFields() == false) {
                        q.select();
                    }
                    //inherit silent mode
                    if (thisQueryable.$silent)  {
                        q.silent();
                    }
                    // if query is a select statement
                    if (q.query.$fixed == null) {
                        // check if foreign key field exists in query
                        var selectEntity = q.model.viewAdapter;
                        if (Object.prototype.hasOwnProperty.call(q.query.$select, selectEntity)) {
                            /**
                             * @type {Array}
                             */
                            var select = Object.getOwnPropertyDescriptor(q.query.$select, selectEntity).value;
                            // find foreign key key
                            var find =  select.find(function(field) {
                                if (field instanceof QueryField) {
                                    // by alias or name
                                    return field.as() === foreignKeyField || field.getName() === foreignKeyField;
                                }
                            });
                            // if foreign key field does not exist
                            if (find == null) {
                                // clone query
                                var q1 = q.clone().select(foreignKeyField);
                                // and select foreign key field
                                var select1 = Object.getOwnPropertyDescriptor(q1.query.$select, selectEntity).value;
                                if (Array.isArray(select1)) {
                                    // append field to select fields
                                    select.push.apply(select, select1);
                                }
                                if (Array.isArray(q.query.$group)) {
                                    find =  q.query.$group.find(function(field) {
                                        if (field instanceof QueryField) {
                                            // by alias or name
                                            return field.as() === foreignKeyField || field.getName() === foreignKeyField;
                                        }
                                    });
                                    if (find == null) {
                                        q.query.$group.push.apply(q.query.$group, select1);
                                    }
                                }
                            }
                        }
                    }
                    // join parents
                    q.query.join(thisQueryable.query.as('j0'))
                        .with(QueryUtils.where(new QueryEntity(thisArg.getChildModel().viewAdapter).select(mapping.childField))
                            .equal(new QueryEntity('j0').select(mapping.parentField)));
                    q.prepare();
                    // final execute query
                    return q.getItems().then(function(results) {
                        arr.forEach(function(item) {
                            var children = results.filter(function(result) {
                                if (item[keyField] == null) {
                                    return false;
                                }
                                var value = result[foreignKeyField];
                                if (value != null && hasOwnProperty(value, keyField) === true) {
                                    // important:: use equal value operator (==)
                                    return value[keyField] == item[keyField];
                                }
                                return value == item[keyField];
                            });
                            var refersTo = thisArg.getParentModel().getAttribute(mapping.refersTo);
                            // if parent field multiplicity attribute defines an one-to-one association
                            if (refersTo && (refersTo.multiplicity === 'ZeroOrOne' || refersTo.multiplicity === 'One')) {
                                if (children[0] != null) {
                                    item[mapping.refersTo] = _.cloneDeep(children[0]);
                                }
                                else {
                                    item[mapping.refersTo] = null;
                                }
                            }
                            else {
                                item[mapping.refersTo] = _.cloneDeep(children);
                            }
                        });
                        return resolve();
                    }).catch(function(err) {
                        return resolve(err);
                    });
                });
            });
        });
    }

}

module.exports = {
    DataMappingExtender,
    DataMappingOptimizedExtender
};

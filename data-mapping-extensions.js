// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const _ = require('lodash');
const {QueryUtils, QueryEntity, QueryField} = require('@themost/query');
const Q = require('q');
const {hasOwnProperty} = require('./has-own-property');

const mappingExtensions = {

    /**
     * @param {DataAssociationMapping|*} mapping
     * @returns {*}
     */
    extend: function(mapping) {
        let thisQueryable, childModel_, parentModel_;
        return {
            /**
             * @param {DataQueryable} dataQueryable
             */
            for: function(dataQueryable) {
                thisQueryable = dataQueryable;
                return this;
            },
            getChildModel: function() {
                if (_.isNil(thisQueryable)) {
                    return;
                }
                if (_.isObject(childModel_)) {
                    return childModel_;
                }
                childModel_ = thisQueryable.model.context.model(mapping.childModel);
                return childModel_;

            },
            getParentModel: function() {
                if (_.isNil(thisQueryable)) {
                    return;
                }
                if (_.isObject(parentModel_)) {
                    return parentModel_;
                }
                parentModel_ = thisQueryable.model.context.model(mapping.parentModel);
                return parentModel_;
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getParents_v1: function(items) {

                let thisArg = this;
                let deferred = Q.defer();
                process.nextTick(function() {
                    if (_.isNil(items)) {
                        return deferred.resolve();
                    }
                    let arr = _.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return deferred.resolve();
                    }
                    if (_.isNil(thisQueryable)) {
                        return deferred.reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.childModel !== thisQueryable.model.name) || (mapping.associationType!=='junction')) {
                        return deferred.resolve();
                    }
                    //get array of key values (for childs)
                    let values = arr.filter(function(x) {
                        return (typeof x[mapping.childField]!=='undefined')
                            && (x[mapping.childField]!=null); 
                    })
                        .map(function(x) {
                            return x[mapping.childField]
                        });
                    //query junction model
                    let HasParentJunction = require('./has-parent-junction').HasParentJunction;
                    let junction = new HasParentJunction(thisQueryable.model.convert({ }), mapping);
                    junction.getBaseModel().where(mapping.associationValueField).in(values).flatten().silent().all(function(err, junctions) {
                        if (err) {
                            return deferred.reject(err); 
                        }
                        //get array of parent key values
                        values = _.intersection(junctions.map(function(x) {
                            return x[mapping.associationObjectField] 
                        }));
                        //get parent model
                        let parentModel = thisArg.getParentModel();
                        //query parent with parent key values
                        parentModel.filter(mapping.options, function(err, q) {
                            if (err) {
                                return deferred.reject(err);
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
                            //and finally query parent
                            q.getItems().then(function(parents){
                                //if result contains only one item
                                if (arr.length === 1) {
                                    arr[0][mapping.refersTo] = parents;
                                    return deferred.resolve();
                                }
                                //otherwise loop result array
                                arr.forEach(function(x) {
                                    //get child (key value)
                                    let childValue = x[mapping.childField];
                                    //get parent(s)
                                    let p = junctions.filter(function(y) {
                                        return (y[mapping.associationValueField]===childValue); 
                                    }).map(function(r) {
                                        return r[mapping.associationObjectField]; 
                                    });
                                    //filter data and set property value (a filtered array of parent objects)
                                    x[mapping.refersTo] = parents.filter(function(z) {
                                        return p.indexOf(z[mapping.parentField])>=0; 
                                    });
                                });
                                return deferred.resolve();
                            }).catch(function(err) {
                                return deferred.reject(err);
                            });
                        });
                    });
                });
                return deferred.promise;
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getParents : function(items) {
                let thisArg = this;
                let deferred = Q.defer();
                process.nextTick(function() {
                    if (_.isNil(items)) {
                        return deferred.resolve();
                    }
                    let arr = _.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return deferred.resolve();
                    }
                    if (_.isNil(thisQueryable)) {
                        return deferred.reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.childModel !== thisQueryable.model.name) || (mapping.associationType!=='junction')) {
                        return deferred.resolve();
                    }
                    let HasParentJunction = require('./has-parent-junction').HasParentJunction;
                    let junction = new HasParentJunction(thisQueryable.model.convert({ }), mapping);
                    return junction.migrate(function(err) {
                        if (err) {
                            return deferred.reject(err); 
                        }
                        let parentModel = thisArg.getParentModel();
                        parentModel.filter(mapping.options, function(err, q) {
                            if (err) {
                                return deferred.reject(err); 
                            }
                            //get junction sub-query
                            let junctionQuery = QueryUtils.query(junction.getBaseModel().name).select([mapping.associationObjectField, mapping.associationValueField])
                                .join(thisQueryable.query.as("j0"))
                                .with(QueryUtils.where(new QueryEntity(junction.getBaseModel().name).select(mapping.associationValueField))
                                    .equal(new QueryEntity("j0").select(mapping.childField)));
                            //append join statement with sub-query
                            q.query.join(junctionQuery.as("g0"))
                                .with(QueryUtils.where(new QueryEntity(parentModel.viewAdapter).select(mapping.parentField))
                                    .equal(new QueryEntity("g0").select(mapping.associationObjectField)));
                            if (!q.query.hasFields()) {
                                q.select();
                            }
                            //inherit silent mode
                            if (thisQueryable.$silent)  {
                                q.silent(); 
                            }
                            //append child key field
                            q.alsoSelect(QueryField.select(mapping.associationValueField).from("g0").as("ref__"));
                            return q.getItems().then(function (parents) {
                                _.forEach(arr, function(x) {
                                    x[mapping.refersTo] = _.filter(parents, function(y) {
                                        if (y['ref__'] === x[mapping.childField]) {
                                            delete y['ref__'];
                                            return true;
                                        }
                                        return false;
                                    });
                                });
                                return deferred.resolve();
                            }).catch(function (err) {
                                return deferred.reject(err);
                            });
                        });
                    });
                });
                return deferred.promise;
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getChilds_v1: function(items) {
                let thisArg = this;
                let deferred = Q.defer();
                process.nextTick(function() {
                    let junction;
                    if (_.isNil(items)) {
                        return deferred.resolve();
                    }
                    let arr = _.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return deferred.resolve();
                    }
                    if (_.isNil(thisQueryable)) {
                        return deferred.reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.parentModel !== thisQueryable.model.name) || (mapping.associationType!=='junction')) {
                        return deferred.resolve();
                    }
                    let values = arr.filter(function(x) {
                        return (typeof x[mapping.parentField]!=='undefined') && (x[mapping.parentField]!=null);
                    }).map(function(x) {
                        return x[mapping.parentField];
                    });
                    if (_.isNil(mapping.childModel)) {
                        let DataObjectTag = require('./data-object-tag').DataObjectTag;
                        junction = new DataObjectTag(thisQueryable.model.convert({ }), mapping);
                        return junction.getBaseModel().where("object").in(values).flatten().silent().select("object", "value").all().then(function(items) {
                            arr.forEach(function(x) {
                                x[mapping.refersTo] = items.filter(function(y) {
                                    return y["object"]===x[mapping.parentField];
                                }).map(function (y) {
                                    return y.value;
                                });
                            });
                            return deferred.resolve();
                        }).catch(function (err) {
                            return deferred.reject(err);
                        });
                    }
                    //create a dummy object
                    let DataObjectJunction = require('./data-object-junction').DataObjectJunction;
                    junction = new DataObjectJunction(thisQueryable.model.convert({ }), mapping);
                    //query junction model
                    return junction.getBaseModel().where(mapping.associationObjectField).in(values).silent().flatten().getItems().then(function(junctions) {
                        //get array of child key values
                        let values = junctions.map(function(x) {
                            return x[mapping.associationValueField] 
                        });
                        //get child model
                        let childModel = thisArg.getChildModel();
                        childModel.filter(mapping.options, function(err, q) {
                            if (err) {
                                return deferred.reject(err);
                            }
                            q.prepare();
                            //Important Backward compatibility issue (<1.8.0)
                            //Description: if $levels parameter is not defined then set the default value to 0.
                            if (typeof q.$levels === 'undefined') {
                                q.$levels = 0;
                            }
                            //inherit silent mode
                            if (thisQueryable.$silent)  {
                                q.silent(); 
                            }
                            //append where statement for this operation
                            if (values.length===1) {
                                q.where(mapping.childField).equal(values[0]);
                            } else {
                                q.where(mapping.childField).in(values);
                            }
                            //and finally query childs
                            let refersTo = thisQueryable.model.getAttribute(mapping.refersTo);
                            q.getItems().then(function(childs) {
                                //if result contains only one item
                                if (arr.length === 1) {
                                    if (refersTo && (refersTo.multiplicity === 'ZeroOrOne' || refersTo.multiplicity === 'One')) {
                                        arr[0][mapping.refersTo] = childs[0] != null ? childs[0] : null;
                                        return deferred.resolve();
                                    }
                                    arr[0][mapping.refersTo] = childs;
                                    return deferred.resolve();
                                }
                                //otherwise loop result array
                                arr.forEach(function(x) {
                                    //get parent (key value)
                                    let parentValue = x[mapping.parentField];
                                    //get parent(s)
                                    let p = junctions.filter(function(y) {
                                        return (y[mapping.associationObjectField]===parentValue); 
                                    }).map(function(r) {
                                        return r[mapping.associationValueField]; 
                                    });
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
                                return deferred.resolve();
                            }).catch(function(err) {
                                return deferred.reject(err);
                            });
                        });
                    }).catch(function (err) {
                        return deferred.reject(err);
                    });
                });
                return deferred.promise;
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getChilds: function(items) {
                let thisArg = this;
                let deferred = Q.defer();
                process.nextTick(function() {
                    if (_.isNil(items)) {
                        return deferred.resolve();
                    }
                    let arr = _.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return deferred.resolve();
                    }
                    if (_.isNil(thisQueryable)) {
                        return deferred.reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.parentModel !== thisQueryable.model.name) || (mapping.associationType!=='junction')) {
                        return deferred.resolve();
                    }
                    let DataObjectJunction = require('./data-object-junction').DataObjectJunction;
                    let junction = new DataObjectJunction(thisQueryable.model.convert({ }), mapping);
                    return junction.migrate(function(err) {
                        if (err) {
                            return deferred.reject(err); 
                        }
                        let childModel = thisArg.getChildModel();
                        childModel.filter(mapping.options, function(err, q) {
                            if (err) {
                                return deferred.reject(err); 
                            }
                            if (!q.query.hasFields()) {
                                q.select();
                            }
                            //get junction sub-query
                            let junctionQuery = QueryUtils.query(junction.getBaseModel().name).select([mapping.associationObjectField, mapping.associationValueField])
                                .join(thisQueryable.query.as("j0"))
                                .with(QueryUtils.where(new QueryEntity(junction.getBaseModel().name).select(mapping.associationObjectField))
                                    .equal(new QueryEntity("j0").select(mapping.parentField)));
                            //append join statement with sub-query
                            q.query.join(junctionQuery.as("g0"))
                                .with(QueryUtils.where(new QueryEntity(childModel.viewAdapter).select(mapping.childField))
                                    .equal(new QueryEntity("g0").select(mapping.associationValueField)));

                            //inherit silent mode
                            if (thisQueryable.$silent)  {
                                q.silent(); 
                            }
                            //append item reference
                            q.alsoSelect(QueryField.select(mapping.associationObjectField).from("g0").as("ref__"));
                            return q.getItems().then(function (childs) {
                                _.forEach(arr, function(x) {
                                    x[mapping.refersTo] = _.filter(childs, function(y) {
                                        if (y['ref__'] === x[mapping.parentField]) {
                                            delete y['ref__'];
                                            return true;
                                        }
                                        return false;
                                    });
                                });
                                return deferred.resolve();
                            }).catch(function (err) {
                                return deferred.reject(err);
                            });
                        });
                    });
                });
                return deferred.promise;
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getAssociatedParents: function(items) {
                let thisArg = this;
                let deferred = Q.defer();
                process.nextTick(function() {
                    if (_.isNil(items)) {
                        return deferred.resolve();
                    }
                    let arr = _.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return deferred.resolve();
                    }
                    if (_.isNil(thisQueryable)) {
                        return deferred.reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.childModel !== thisQueryable.model.name) || (mapping.associationType!=='association')) {
                        return deferred.resolve();
                    }
                    thisArg.getParentModel().migrate(function(err) {
                        if (err) {
                            return deferred.reject(err); 
                        }
                        thisArg.getParentModel().filter(mapping.options, function(err, q) {
                            if (err) {
                                return deferred.reject(err); 
                            }
                            //Important Backward compatibility issue (<1.8.0)
                            //Description: if $levels parameter is not defined then set the default value to 0.
                            if (typeof q.$levels === 'undefined') {
                                q.$levels = 0;
                            }
                            if (typeof q.query.$select === 'undefined') {
                                q.select();
                            }
                            q.query
                                .distinct()
                                .join(thisQueryable.query.as('j0'))
                                .with(QueryUtils.where(new QueryEntity(thisArg.getParentModel().viewAdapter).select(mapping.parentField))
                                    .equal(new QueryEntity("j0").select(mapping.childField)));
                            //inherit silent mode
                            if (thisQueryable.$silent)  {
                                q.silent(); 
                            }
                            q.silent().getAllItems().then(function(parents) {
                                let childField = thisQueryable.model.field(mapping.childField);
                                let keyField = childField.property || childField.name;
                                let iterator = function(x) {
                                    let key = x[keyField];
                                    x[keyField] = _.find(parents, function(x) {
                                        return x[mapping.parentField] === key;
                                    });
                                };
                                _.forEach(arr, iterator);
                                return deferred.resolve();
                            }).catch(function (err) {
                                return deferred.reject(err);
                            });
                        });
                    });
                });
                return deferred.promise;
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getAssociatedParents_v1: function(items) {
                let thisArg = this;
                let deferred = Q.defer();
                process.nextTick(function() {
                    if (_.isNil(items)) {
                        return deferred.resolve();
                    }
                    let arr = _.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return deferred.resolve();
                    }
                    if (_.isNil(thisQueryable)) {
                        return deferred.reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.childModel !== thisQueryable.model.name) || (mapping.associationType!=='association')) {
                        return deferred.resolve();
                    }
                    thisArg.getParentModel().migrate(function(err) {
                        if (err) {
                            return deferred.reject(err); 
                        }
                        let childField = thisQueryable.model.field(mapping.childField);
                        let keyField = childField.property || childField.name;
                        if (_.isNil(childField)) {
                            return deferred.reject("The specified field cannot be found on child model");
                        }
                        let values = _.intersection(_.map(_.filter(arr, function(x) {
                            return hasOwnProperty(x, keyField);
                        }), function (x) {
                            return x[keyField];
                        }));
                        if (values.length===0) {
                            return deferred.resolve();
                        }
                        thisArg.getParentModel().filter(mapping.options, function(err, q) {
                            if (err) {
                                return deferred.reject(err);
                            }
                            q.prepare();
                            //Important Backward compatibility issue (<1.8.0)
                            //Description: if $levels parameter is not defined then set the default value to 0.
                            if (typeof q.$levels === 'undefined') {
                                q.$levels = 0;
                            }
                            //inherit silent mode
                            if (thisQueryable.$silent)  {
                                q.silent(); 
                            }
                            //append where statement for this operation
                            q.where(mapping.parentField).in(values);
                            //set silent (?)
                            q.silent().getAllItems().then(function(parents) {
                                let key=null,
                                    selector = function(x) {
                                        return x[mapping.parentField]===key;
                                    },
                                    iterator = function(x) {
                                        key = x[keyField];
                                        if (childField.property && childField.property!==childField.name) {
                                            x[childField.property] = parents.filter(selector)[0];
                                            delete x[childField.name];
                                        } else {
                                            x[childField.name] = parents.filter(selector)[0];
                                        }
                                    };
                                if (_.isArray(arr)) {
                                    arr.forEach(iterator);
                                }
                                return deferred.resolve();
                            }).catch(function(err) {
                                return deferred.reject(err);
                            });
                        });
                    });
                });
                return deferred.promise;
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getAssociatedChilds_v1: function(items) {
                let thisArg = this;
                let deferred = Q.defer();
                process.nextTick(function() {
                    if (_.isNil(items)) {
                        return deferred.resolve();
                    }
                    let arr = _.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return deferred.resolve();
                    }
                    if (_.isNil(thisQueryable)) {
                        return deferred.reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.parentModel !== thisQueryable.model.name) || (mapping.associationType!=='association')) {
                        return deferred.resolve();
                    }
                    thisArg.getChildModel().migrate(function(err) {
                        if (err) {
                            return deferred.reject(err); 
                        }
                        let parentField = thisQueryable.model.field(mapping.parentField);
                        if (_.isNil(parentField)) {
                            return deferred.reject("The specified field cannot be found on parent model");
                        }
                        let keyField = parentField.property || parentField.name;
                        let values = _.intersection(_.map(_.filter(arr, function(x) {
                            return hasOwnProperty(x, keyField);
                        }), function (x) {
                            return x[keyField];
                        }));
                        if (values.length===0) {
                            return deferred.resolve();
                        }
                        //search for view named summary
                        thisArg.getChildModel().filter(mapping.options, function(err, q) {
                            if (err) {
                                return deferred.reject(err);
                            }
                            let childField = thisArg.getChildModel().field(mapping.childField);
                            if (_.isNil(childField)) {
                                return deferred.reject("The specified field cannot be found on child model");
                            }
                            let foreignKeyField = childField.property || childField.name;
                            //Important Backward compatibility issue (<1.8.0)
                            //Description: if $levels parameter is not defined then set the default value to 0.
                            if (typeof q.$levels === 'undefined') {
                                q.$levels = 0;
                            }
                            q.prepare();
                            if (values.length===1) {
                                q.where(mapping.childField).equal(values[0]);
                            } else {
                                q.where(mapping.childField).in(values);
                            }
                            //inherit silent mode
                            if (thisQueryable.$silent)  {
                                q.silent(); 
                            }
                            //final execute query
                            return q.getItems().then(function(childs) {
                                // get referrer field of parent model
                                let refersTo = thisArg.getParentModel().getAttribute(mapping.refersTo);
                                _.forEach(arr, function(x) {
                                    let items = _.filter(childs, function(y) {
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
                                        } else {
                                            // or nothing
                                            x[mapping.refersTo] = null;
                                        }
                                    } else {
                                        // otherwise get all items
                                        x[mapping.refersTo] = items;
                                    }
                                });
                                return deferred.resolve();
                            }).catch(function(err) {
                                return deferred.resolve(err);
                            });
                        });
                    });
                });
                return deferred.promise;
            },
            /**
             * @param {*} items
             * @returns {Promise|*}
             */
            getAssociatedChilds: function(items) {
                let thisArg = this;
                let deferred = Q.defer();
                process.nextTick(function() {
                    if (_.isNil(items)) {
                        return deferred.resolve();
                    }
                    let arr = _.isArray(items) ? items : [items];
                    if (arr.length === 0) {
                        return deferred.resolve();
                    }
                    if (_.isNil(thisQueryable)) {
                        return deferred.reject('The underlying data queryable cannot be empty at this context.');
                    }
                    if ((mapping.parentModel !== thisQueryable.model.name) || (mapping.associationType!=='association')) {
                        return deferred.resolve();
                    }
                    thisArg.getChildModel().migrate(function(err) {
                        if (err) {
                            return deferred.reject(err); 
                        }
                        let parentField = thisArg.getParentModel().field(mapping.parentField);
                        if (_.isNil(parentField)) {
                            return deferred.reject("The specified field cannot be found on parent model");
                        }
                        let keyField = parentField.property || parentField.name;
                        let values = _.intersection(_.map(_.filter(arr, function(x) {
                            return hasOwnProperty(x, keyField);
                        }), function (x) {
                            return x[keyField];
                        }));
                        if (values.length===0) {
                            return deferred.resolve();
                        }
                        //search for view named summary
                        thisArg.getChildModel().filter(mapping.options, function(err, q) {
                            if (err) {
                                return deferred.reject(err);
                            }
                            let childField = thisArg.getChildModel().field(mapping.childField);
                            if (_.isNil(childField)) {
                                return deferred.reject("The specified field cannot be found on child model");
                            }
                            let foreignKeyField = childField.property || childField.name;
                            //Important Backward compatibility issue (<1.8.0)
                            //Description: if $levels parameter is not defined then set the default value to 0.
                            if (typeof q.$levels === 'undefined') {
                                q.$levels = 0;
                            }
                            if (!q.query.hasFields()) {
                                q.select();
                            }
                            //inherit silent mode
                            if (thisQueryable.$silent)  {
                                q.silent(); 
                            }
                            //join parents
                            q.query.join(thisQueryable.query.as("j0"))
                                .with(QueryUtils.where(new QueryEntity(thisArg.getChildModel().viewAdapter).select(mapping.childField))
                                    .equal(new QueryEntity("j0").select(mapping.parentField)));
                            q.prepare();
                            //final execute query
                            return q.getItems().then(function(childs) {
                                _.forEach(arr, function(x) {
                                    x[mapping.refersTo] = _.filter(childs, function(y) {
                                        if (!_.isNil(y[foreignKeyField]) && hasOwnProperty(y[foreignKeyField], keyField)) {
                                            return y[foreignKeyField][keyField] === x[keyField];
                                        }
                                        return y[foreignKeyField] === x[keyField];
                                    });
                                });
                                return deferred.resolve();
                            }).catch(function(err) {
                                return deferred.resolve(err);
                            });
                        });
                    });
                });
                return deferred.promise;
            }
        };
    }
};

module.exports = mappingExtensions;

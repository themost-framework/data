// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const _ = require('lodash');
const {DataNotFoundError} = require('@themost/common');
const async = require('async');
const {hasOwnProperty} = require('./has-own-property');

/**
 * @class
 * @constructor
 * @classdesc Validates the state of a data object. DataStateValidatorListener is one of the default listeners which are being registered for all data models.
 */
class DataStateValidatorListener {
    constructor() {
        //
    }
    /**
     * Occurs before creating or updating a data object and validates object state.
     * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    beforeSave(event, callback) {
        try {
            if (_.isNil(event)) {
                return callback();
            }
            if (_.isNil(event.state)) {
                event.state = 1; 
            }

            let model = event.model, target = event.target;
            //if model or target is not defined do nothing and exit
            if (_.isNil(model) || _.isNil(target)) {
                return callback();
            }
            //get key state
            let keyState = (model.primaryKey && hasOwnProperty(target, model.primaryKey));
            //if target has $state property defined, set this state and exit
            if (event.target.$state) {
                event.state = event.target.$state;
            } else if (keyState) {
            //if object has primary key
                event.state = 2;
            }
            //if state is Update (2)
            if (event.state === 2) {
                //if key exists exit
                if (keyState) {
                    return callback();
                } else {
                    return mapKey_.call(model, target, function (err) {
                        if (err) {
                            return callback(err); 
                        }
                        //if object is mapped with a key exit
                        return callback();
                    });
                }
            } else if (event.state === 1) {
                if (!keyState) {
                    return mapKey_.call(model, target, function (err, result) {
                        if (err) {
                            return callback(err); 
                        }
                        if (result) {
                            //set state to Update
                            event.state = 2;
                        }
                        return callback();
                    });
                }
                //otherwise do nothing
                return callback();
            } else {
                return callback();
            }

        } catch (er) {
            callback(er);
        }
    }
    /**
     * Occurs before removing a data object and validates object state.
     * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    beforeRemove(event, callback) {
        //validate event arguments
        if (_.isNil(event)) {
            return callback(); 
        }
        //validate state (the default is Delete=4)
        if (_.isNil(event.state)) {
            event.state = 4; 
        }
        let model = event.model, target = event.target;
        //if model or target is not defined do nothing and exit
        if (_.isNil(model) || _.isNil(target)) {
            return callback();
        }
        //if object primary key is already defined
        if (model.primaryKey && hasOwnProperty(target, model.primaryKey)) {
            // check if object exists
            return model.where(model.primaryKey).equal(target[model.primaryKey]).value().then(function (result) {
                if (typeof result !== 'undefined' && result !== null) {
                    // set state to deleted
                    event.state = 4;
                    // return
                    return callback();
                }
                // otherwise throw error not found
                return callback(_.assign(new DataNotFoundError('The target object cannot be found or is inaccessible.', null, model.name), {
                    'key': target[model.primaryKey]
                }));
            }).catch(function (err) {
                return callback(err);
            });
        }
        mapKey_.call(model, target, function (err, result) {
            if (err) {
                return callback(err);
            } else if (typeof result !== 'undefined' && result !== null) {
                //continue and exit
                return callback();
            } else {
                callback(new DataNotFoundError('The target object cannot be found or is inaccessible.', null, model.name));
            }
        });

    }
}
/**
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
function mapKey_(obj, callback) {
    let self = this;
    if (_.isNil(obj)) {
        return callback(new Error('Object cannot be null at this context'));
    }
    if (self.primaryKey && hasOwnProperty(obj, self.primaryKey)) {
        //already mapped
        return callback(null, true);
    }
    //get unique constraints
    let arr = self.constraintCollection.filter(function(x) {
            return x.type==='unique' 
        }), objectFound=false;
    if (arr.length === 0) {
        //do nothing and exit
        return callback();
    }
    async.eachSeries(arr, function(constraint, cb) {
        try {
            if (objectFound) {
                return cb();
            }
            /**
             * @type {DataQueryable}
             */
            let q = null;
            let fnAppendQuery = function(attr, value) {
                if (_.isNil(value)) {
                    value = null;
                }
                if (q) {
                    q.and(attr).equal(value);
                } else {
                    q = self.where(attr).equal(value);
                }
            };
            if (_.isArray(constraint.fields)) {
                for (let i = 0; i < constraint.fields.length; i++) {
                    let attr = constraint.fields[i];
                    if (!hasOwnProperty(obj, attr)) {
                        return cb();
                    }
                    let parentObj = obj[attr];
                    let value = parentObj;
                    //check field mapping
                    let mapping = self.inferMapping(attr);
                    if (_.isObject(mapping) && (typeof parentObj === 'object')) {
                        if (hasOwnProperty(parentObj, mapping.parentField)) {
                            fnAppendQuery(attr, parentObj[mapping.parentField]);
                        } else {
                            /**
                             * Try to find if parent model has a unique constraint and constraint fields are defined
                             * @type {DataModel}
                             */
                            let parentModel = self.context.model(mapping.parentModel),
                                parentConstraint = parentModel.constraintCollection.find(function(x) {
                                    return x.type==='unique' 
                                });
                            if (parentConstraint) {
                                parentConstraint.fields.forEach(function(x) {
                                    fnAppendQuery(attr + '/' + x, parentObj[x]);
                                });
                            } else {
                                fnAppendQuery(attr, null);
                            }
                        }
                    } else {
                        fnAppendQuery(attr, value);
                    }
                }
                if (q == null) {
                    cb();
                } else {
                    q.silent().flatten().select(self.primaryKey).value(function(err, result) {
                        if (err) {
                            cb(err);
                        } else if (typeof result !== 'undefined' && result !== null) {
                            //set primary key value
                            obj[self.primaryKey] = result;
                            //object found
                            objectFound=true;
                            cb();
                        } else {
                            cb();
                        }
                    });
                }
            } else {
                cb();
            }
        } catch(e) {
            cb(e);
        }
    }, function(err) {
        callback(err, objectFound);
    });
}

module.exports = {
    DataStateValidatorListener
};

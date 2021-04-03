// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const async = require('async');
const {HasParentJunction} = require('./has-parent-junction');
const {DataObjectJunction} = require('./data-object-junction');
const {DataError} = require('@themost/common').DataError;
const _ = require('lodash');
const {hasOwnProperty} = require('./has-own-property');

/**
 * @class
 */
class DataReferencedObjectListener {
    constructor() {
        //
    }
    /**
     * @param {DataEventArgs} event
     * @param {function(Error=)} callback
     */
    beforeRemove(event, callback) {
        return event.model.getReferenceMappings(false).then(function (mappings) {
            async.eachSeries(mappings,
                /**
                 * @param {DataAssociationMapping} mapping
                 * @param {Function} cb
                 */
                function (mapping, cb) {
                    if (mapping.associationType === 'association') {
                        return beforeRemoveAssociatedObjects(event, mapping, cb);
                    } else if (mapping.associationType === 'junction' && mapping.parentModel === event.model.name) {
                        return beforeRemoveChildConnectedObjects(event, mapping, cb);
                    } else if (mapping.associationType === 'junction' && mapping.childModel === event.model.name) {
                        return beforeRemoveParentConnectedObjects(event, mapping, cb);
                    } else {
                        return cb();
                    }
                }, function (err) {
                    callback(err);
                });
        }).catch(function (err) {
            return callback(err);
        });
    }
}

/**
 * @private
 * @param {DataEventArgs} event
 * @param {DataAssociationMapping} mapping
 * @param {Function} callback
 */
function beforeRemoveAssociatedObjects(event, mapping, callback) {
    if (mapping.associationType !== 'association') {
        return callback(new TypeError('Invalid association type. Expected a valid foreign key association.'));
    }
    if (mapping.parentModel !== event.model.name) {
        return callback(new TypeError('Invalid association type. Expected a valid referenced key association.'));
    }
    let context = event.model.context;
    let parentModel = event.model,
        silent = event.model.$silent,
        target = event.model.convert(event.target),
        childModel = context.model(mapping.childModel),
        parentField = event.model.getAttribute(mapping.parentField),
        childField = childModel.getAttribute(mapping.childField);
    parentModel.where(parentModel.primaryKey).equal(target[parentModel.primaryKey])
        .select(parentField.name)
        .cache(false)
        .silent()
        .flatten()
        .value()
        .then(function(parentKey) {
            if (_.isNil(parentKey)) {
                return callback();
            }
            return childModel.where(mapping.childField).equal(parentKey)
                .cache(false)
                .silent()
                .count().then(function(count) {
                    if (count>0) {
                        mapping.cascade = mapping.cascade || 'none';
                        if (mapping.cascade === 'none') {
                            return callback(new DataError('E_FOREIGN_KEY','Cannot remove an entity since it is being referenced by another entity.',null,childModel.name, childField.name));
                        } else if (mapping.cascade === 'null' || mapping.cascade === 'default') {
                            return childModel.where(mapping.childField).equal(target[mapping.parentField])
                                .select(childModel.primaryKey, childModel.childField)
                                .cache(false)
                                .silent()
                                .flatten()
                                .all().then(function(items) {
                                    let childKey = childField.property || childField.name;
                                    _.forEach(items, function(x) {
                                        if (hasOwnProperty(x, childKey)) {
                                            x[childKey] = null;
                                        } else {
                                            x[childKey] = null;
                                        }
                                    });
                                    return childModel.silent(silent).save(items).then(function() {
                                        return callback();
                                    });
                                });
                        } else if (mapping.cascade === 'delete') {
                            return childModel.where(mapping.childField).equal(target[mapping.parentField])
                                .select(childModel.primaryKey)
                                .cache(false)
                                .silent()
                                .flatten()
                                .all().then(function(items) {
                                    return childModel.silent(silent).remove(items).then(function() {
                                        return callback();
                                    });
                                });
                        } else {
                            return callback(new DataError('E_ATTRIBUTE', 'Invalid cascade action', childModel.name, childField.name));
                        }
                    } else {
                        return callback();
                    }
                });
        }).catch(function(err) {
            return callback(err);
        });
}
/**
 * @private
 * @param {DataEventArgs} event
 * @param {DataAssociationMapping} mapping
 * @param {Function} callback
 */
function beforeRemoveParentConnectedObjects(event, mapping, callback) {
    if (mapping.associationType !== 'junction') {
        return callback(new TypeError('Invalid association type. Expected a valid junction.'));
    }
    if (mapping.childModel !== event.model.name) {
        return callback();
    }
    let childModel = event.model,
        silent = event.model.$silent,
        target = event.model.convert(event.target),
        childField = childModel.getAttribute(mapping.childField);
    let junction = new DataObjectJunction(target, mapping);
    return childModel.where(childModel.primaryKey).equal(target.getId())
        .select(childField.name)
        .cache(false)
        .silent()
        .flatten()
        .value()
        .then(function(childKey) {
            if (_.isNil(childKey)) {
                return callback();
            }
            let baseModel = junction.getBaseModel();
            baseModel.where(junction.getValueField()).equal(childKey)
                .select(baseModel.primaryKey)
                .cache(false)
                .silent()
                .all().then(function(items) {
                    mapping.cascade = mapping.cascade || 'none';
                    if (mapping.cascade === 'none') {
                        if (items.length === 0) {
                            return callback();
                        }
                        return callback(new DataError('E_FOREIGN_KEY','Cannot remove an entity since it is being referenced by another entity.',null,childModel.name, childField.name));
                    } else if (mapping.cascade === 'delete'  || mapping.cascade === 'null' || mapping.cascade === 'default') {
                        return baseModel.silent(silent).remove(items).then(function() {
                            return callback();
                        });
                    } else {
                        return callback(new DataError('E_ATTRIBUTE', 'Invalid cascade action', childModel.name, childField.name));
                    }

                }).catch(function(err) {
                    return callback(err);
                });
        });
}

/**
 * @private
 * @param {DataEventArgs} event
 * @param {DataAssociationMapping} mapping
 * @param {Function} callback
 */
function beforeRemoveChildConnectedObjects(event, mapping, callback) {
    if (mapping.associationType !== 'junction') {
        return callback(new TypeError('Invalid association type. Expected a valid junction.'));
    }
    if (mapping.parentModel !== event.model.name) {
        return callback();
    }
    let silent = event.model.$silent,
        target = event.model.convert(event.target),
        parentModel =  event.model,
        parentField = parentModel.getAttribute(mapping.parentField);
    let junction = new HasParentJunction(target, mapping);
    return parentModel.where(parentModel.primaryKey).equal(target.getId())
        .select(parentField.name)
        .cache(false)
        .silent()
        .flatten()
        .value()
        .then(function(parentKey) {
            if (_.isNil(parentKey)) {
                return callback();
            }
            let baseModel = junction.getBaseModel();
            baseModel.where(junction.getObjectField()).equal(parentKey)
                .select(baseModel.primaryKey)
                .cache(false)
                .silent()
                .all().then(function(items) {
                    mapping.cascade = mapping.cascade || 'none';
                    if (mapping.cascade === 'none') {
                        if (items.length===0) {
                            return callback();
                        }
                        return callback(new DataError('E_FOREIGN_KEY','Cannot remove an entity since it is being referenced by another entity.',null,parentModel.name, parentField.name));
                    } else if (mapping.cascade === 'delete'  || mapping.cascade === 'null' || mapping.cascade === 'default') {
                        if (items.length===0) {
                            return callback();
                        }
                        return baseModel.silent(silent).remove(items).then(function() {
                            return callback();
                        });
                    } else {
                        return callback(new DataError('E_ATTRIBUTE', 'Invalid cascade action', parentModel.name, parentField.name));
                    }
                }).catch(function(err) {
                    return callback(err);
                });
        });
}

module.exports = {DataReferencedObjectListener};

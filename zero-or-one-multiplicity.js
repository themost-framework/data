// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
var Q = require('q');
var _ = require('lodash');
var DataError = require('@themost/common').DataError;
var DataObjectJunction = require('./data-object-junction').DataObjectJunction;
function ZeroOrOneMultiplicityListener() {
    //
}
/**
 * @param {DataEventArgs} event
 * @param {Function(Error=)} callback
 */
ZeroOrOneMultiplicityListener.prototype.afterSave = function(event, callback) {
    var afterSaveAsync = ZeroOrOneMultiplicityListener.prototype.afterSaveAsync.bind(this);
    return afterSaveAsync(event).then(function() {
        return callback();
    }).catch(function(err) {
        return callback(err);
    });
}
/**
 * @param {DataEventArgs} event
 * @return {Promise<void>}
 */
ZeroOrOneMultiplicityListener.prototype.afterSaveAsync = function(event) {
    return Q.Promise(function(resolve, reject) {
        // get attributes that defines an zero or one multiplicity association
        // with this context model
        var attributes = _.filter(event.model.attributes, function(attribute) {
            if (Object.prototype.hasOwnProperty.call(event.target, attribute.name) === false) {
                return false;
            }
            if (attribute.mapping == null) {
                return false;
            }
            // get mapping 
            var mapping = event.model.inferMapping(attribute.name);
            return !attribute.nested && //exclude nested attributes
                attribute.multiplicity === 'ZeroOrOne' && // validate multiplicity
                mapping.associationType === 'junction' && // and association type
                mapping.parentModel === event.model.name ;
        });
        if (attributes.length === 0) {
            // do nothing
            return resolve();
        }
        var sources = _.map(attributes, function(attribute) {
            return Q.Promise(function(_resolve, _reject) {
                // exclude readonly attributes
                if (Object.prototype.hasOwnProperty.call(attribute, 'readonly')) {
                    if (attribute.readonly) {
                        return _resolve();
                    }
                }
                // exclude non-editable attributes while updating object
                if (Object.prototype.hasOwnProperty.call(attribute, 'editable') && event.state === 2) {
                    if (!attribute.editable) {
                        return _resolve();
                    }
                }
                const child = event.target[attribute.name];
                var context = event.model.context;
                // get target
                var target = event.model.convert(event.target);
                // get attribute mapping
                var mapping = event.model.inferMapping(attribute.name);
                // get association def
                var association = new DataObjectJunction(target, mapping);
                if (child != null) {
                    // get silent model of parent model
                    var silent = event.model.isSilent();
                    // find child
                    var childModel = context.model(mapping.childModel);
                    return childModel.silent(silent).find(child).getItem().then(function(item) {
                        if (item == null) {
                            return _reject(new DataError('EDATA','An associated object cannot be found.',null, event.model.name, attribute.name));
                        }
                        // try to create association between parent and child
                        return association.silent(silent).insert(item).then(function() {
                            return _resolve();
                        });
                    }).catch(function(err) {
                        return _reject(err);
                    });
                } else {
                    // remove zero or one association
                    // get item
                    return association.silent(silent).getItem().then(function(item) {
                        // if child already exists remove association
                        if (item) {
                            return association.silent(silent).remove(item).then(function() {
                                return _resolve();
                            });
                        }
                        // otherwise do nothing
                        return _resolve();
                    }).catch(function(err) {
                        return _reject(err);
                    });
                }
            });
        });
        // execute all promises
        Q.all(sources).then(function() {
            return resolve();
        }).catch(function(err) {
            return reject(err);
        });
    });
}

module.exports = {
        ZeroOrOneMultiplicityListener
    };
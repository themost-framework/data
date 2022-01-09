// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const {eachSeries} = require('async');
const {parsers} = require('./types');
const {DataError} = require('@themost/common');
const {HasParentJunction} = require('./has-parent-junction');
const {DataObjectJunction} = require('./data-object-junction');
const {DataObjectTag} = require('./data-object-tag');
const parseBoolean = parsers.parseBoolean;

class DataObjectAssociationError extends DataError {
    constructor(model, field) {
        super('E_ASSOCIATION', 'An associated object cannot be found or is inaccessible.',null, model, field);
    }
}

class DataObjectMultiAssociationError extends DataError {
    constructor(model, field) {
        super('E_MULTI_ASSOCIATION', 'An associated object is defined more than once and cannot be bound.',null, model, field);
    }
}

class DataObjectAssociationListener {
    /**
     * @param {DataEventArgs} event
     * @param {function(Error=)} callback
     */
    beforeSave(event, callback) {
        try {
            if (event.target == null) {
                return callback();
            }
            const keys = Object.keys(event.target);
            let mappings = [];
            keys.forEach(function(key) {
                if (Object.prototype.hasOwnProperty.call(event.target, key) && event.target[key] != null) {
                    //try to find field mapping, if any
                    let mapping = event.model.inferMapping(key);
                    if (mapping && mapping.associationType === 'association' &&
                            mapping.childModel===event.model.name) {
                        mappings.push(mapping);
                    }
                }
            });
            return eachSeries(mappings,
                /**
                 * @param {DataAssociationMapping} mapping
                 * @param {function(Error=)} cb
                 */
                function(mapping, cb) {
                    if (mapping.associationType==='association' && mapping.childModel === event.model.name) {
                        /**
                         * @type {DataField|*}
                         */
                        let field = event.model.field(mapping.childField);
                        let childField = field.property || field.name;
                        //change:21-Mar 2016
                        //description: check if association belongs to this model or it's inherited from any base model
                        //if current association belongs to base model
                        if ((event.model.name !== field.model) && (!parseBoolean(field.cloned))) {
                            //do nothing and exit
                            return cb();
                        }
                        let silentMode = event.model.isSilent();
                        //get associated model
                        let associatedObject = event.target[childField]; 
                        let associatedModel = event.model.context.model(mapping.parentModel);
                        // try to find associated object
                        return associatedModel.find(associatedObject).select(mapping.parentField)
                            .flatten().silent(silentMode).take(1).getList().then(function(result) {
                                if (result == null) {
                                    return cb(new DataObjectAssociationError(mapping.childModel, mapping.childField));
                                } else if (result.total === 0) {
                                    return cb(new DataObjectAssociationError(mapping.childModel, mapping.childField));
                                } else if (result.total > 1) {
                                    return cb(new DataObjectMultiAssociationError(mapping.childModel, mapping.childField));
                                } else {
                                    if ( typeof associatedObject === 'object' && Object.prototype.hasOwnProperty.call(associatedObject, mapping.parentField) === false) {
                                        // set foreign key
                                        Object.defineProperty(associatedObject, mapping.parentField, {
                                            configurable: true,
                                            enumerable: true,
                                            writable: true,
                                            value: result.value[0][mapping.parentField]
                                        });
                                    }
                                    return cb();
                                }
                            }).catch(function(err) {
                                return cb(err);
                            });
                    } else {
                        return cb();
                    }
    
                }, function(err) {
                    return callback(err);
                });
        } catch (err) {
            return callback(err);
        }
    }
    /**
     * @param {DataEventArgs} event
     * @param {function(Error=)} callback
     */
    afterSave(event, callback) {
        try {
            if (event.target == null) {
                return callback();
            } else {
                let keys = Object.keys(event.target);
                let mappings = [];
                keys.forEach(function(key) {
                    if (Object.prototype.hasOwnProperty.call(event.target, key) && event.target[key] != null) {
                        /**
                         * @type DataAssociationMapping
                         */
                        let mapping = event.model.inferMapping(key);
                        if (mapping != null) {
                            let attribute = event.model.getAttribute(key);
                            // get only many-to-many associations
                            if (mapping.associationType==='junction' && attribute.multiplicity === 'Many') {
                                mappings.push({ name:key, mapping:mapping });
                            }
                        }
                    }
                });
                if (mappings.length === 0) {
                    return callback();
                }
                eachSeries(mappings,
                    /**
                     * @param {{name:string,mapping:DataAssociationMapping}} x
                     * @param {function(Error=)} cb
                     */
                    function(x, cb) {
    
                        let silentMode = event.model.isSilent();
    
                        if (x.mapping.associationType==='junction') {
                            let obj = event.model.convert(event.target);
                            /**
                             * @type {*|{deleted:Array}}
                             */
                            let childs = obj[x.name]
                            let junction;
                            if (!Array.isArray(childs)) { 
                                return cb(); 
                            }
                            if (x.mapping.childModel===event.model.name) {
                                junction = new HasParentJunction(obj, x.mapping);
                                if (event.state===1 || event.state===2) {
                                    let toBeRemoved = [];
                                    let toBeInserted = [];
                                    childs.forEach(function(x) {
                                        if (x.$state === 4) {
                                            toBeRemoved.push(x);
                                        } else {
                                            toBeInserted.push(x);
                                        }
                                    });
                                    junction.silent(silentMode).insert(toBeInserted, function(err) {
                                        if (err) {
                                            return cb(err); 
                                        }
                                        junction.silent(silentMode).remove(toBeRemoved, function(err) {
                                            if (err) {
                                                return cb(err); 
                                            }
                                            return cb();
                                        });
                                    });
                                } else  {
                                    return cb();
                                }
                            } else if (x.mapping.parentModel===event.model.name) {
                                if (event.state===1 || event.state===2) {
                                    if (typeof x.mapping.childModel === 'undefined') {
                                        /**
                                         * @type {DataObjectTag}
                                         */
                                        let tags = new DataObjectTag(obj, x.mapping);
                                        return tags.silent(silentMode).all().then(function(result) {
                                            let toBeRemoved = result.filter(function(x) {
                                                return childs.indexOf(x)<0; 
                                            });
                                            let toBeInserted = childs.filter(function(x) {
                                                return result.indexOf(x)<0; 
                                            });
                                            if (toBeRemoved.length>0) {
                                                return tags.silent(silentMode).remove(toBeRemoved).then(function() {
                                                    if (toBeInserted.length===0) {
                                                        return cb(); 
                                                    }
                                                    return tags.silent(silentMode).insert(toBeInserted).then(function() {
                                                        return cb();
                                                    });
                                                }).catch(function (err) {
                                                    return cb(err);
                                                });
                                            }
                                            if (toBeInserted.length===0) {
                                                return cb(); 
                                            }
                                            return tags.silent(silentMode).insert(toBeInserted).then(function() {
                                                return cb();
                                            });
                                        }).catch(function (err) {
                                            return cb(err);
                                        });
                                    } else {
                                        junction = new DataObjectJunction(obj, x.mapping);
                                        junction.silent(silentMode).insert(childs, function(err) {
                                            if (err) {
                                                return cb(err); 
                                            }
                                            let toBeRemoved = []; let toBeInserted = [];
                                            childs.forEach(function(x) {
                                                if (x.$state === 4) {
                                                    toBeRemoved.push(x);
                                                } else {
                                                    toBeInserted.push(x);
                                                }
                                            });
                                            junction.silent(silentMode).insert(toBeInserted, function(err) {
                                                if (err) {
                                                    return cb(err);
                                                }
                                                junction.silent(silentMode).remove(toBeRemoved, function(err) {
                                                    if (err) { 
                                                        return cb(err);
                                                    }
                                                    return cb();
                                                });
                                            });
                                        });
                                    }
                                } else  {
                                    cb();
                                }
                            } else {
                                cb();
                            }
                        } else {
                            cb();
                        }
                    }, function(err) {
                        callback(err);
                    });
            }
        } catch (err) {
            callback(err);
        }
    }
}

module.exports = {
    DataObjectAssociationListener,
    DataObjectAssociationError,
    DataObjectMultiAssociationError
};
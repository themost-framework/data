// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const async = require('async');
const {parsers} = require('./types');
const {DataError} = require('@themost/common');
const {hasOwnProperty} = require('./has-own-property');
const parseBoolean = parsers.parseBoolean;

/**
 * @class
 * @constructor
 */
class DataObjectAssociationListener {
    constructor() {
        //
    }

    /**
     *
     * @param {DataEventArgs} event
     * @param {function(Error=)} callback
     */
    beforeSave(event, callback) {
        try {
            if (event.target == null) {
                return callback();
            } else {
                let keys = Object.keys(event.target);
                let mappings = [];
                keys.forEach(function (x) {
                    if (hasOwnProperty(event.target, x) && typeof event.target[x] === 'object' && event.target[x] !== null) {
                        //try to find field mapping, if any
                        let mapping = event.model.inferMapping(x);
                        if (mapping && mapping.associationType === 'association' && mapping.childModel === event.model.name) {
                            mappings.push(mapping);
                        }
                    }
                });
                async.eachSeries(mappings,
                    /**
                     * @param {DataAssociationMapping} mapping
                     * @param {function(Error=)} cb
                     */
                    function (mapping, cb) {
                        if (mapping.associationType === 'association' && mapping.childModel === event.model.name) {
                            /**
                             * @type {DataField|*}
                             */
                            let field = event.model.field(mapping.childField),
                                childField = field.property || field.name;
                            //foreign key association
                            if (typeof event.target[childField] !== 'object') {
                                return cb();
                            }
                            if (hasOwnProperty(event.target[childField], mapping.parentField)) {
                                return cb();
                            }
                            //change:21-Mar 2016
                            //description: check if association belongs to this model or it's inherited from any base model
                            //if current association belongs to base model
                            if ((event.model.name !== field.model) && (!parseBoolean(field.cloned))) {
                                //do nothing and exit
                                return cb();
                            }
                            //get associated mode
                            let associatedModel = event.model.context.model(mapping.parentModel);
                            associatedModel.find(event.target[childField]).select(mapping.parentField).silent().flatten().take(1).list(function (err, result) {
                                if (err) {
                                    cb(err);
                                } else if (result == null) {
                                    return cb(new DataError('E_DATA', 'An associated object cannot be found.', null, associatedModel.name));
                                } else if (result.total === 0) {
                                    return cb(new DataError('E_DATA', 'An associated object cannot be found.', null, associatedModel.name));
                                } else if (result.total > 1) {
                                    return cb(new DataError('E_DATA', 'An associated object is defined more than once and cannot be bound.', null, associatedModel.name));
                                } else {
                                    event.target[childField][mapping.parentField] = result.value[0][mapping.parentField];
                                    cb();
                                }
                            });
                        } else {
                            cb();
                        }
                    }, function (err) {
                        if (err) {
                            console.log(err);
                        }
                        callback(err);
                    });
            }
        } catch (err) {
            callback(err);
        }
    }

    /**
     *
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
                keys.forEach(function (x) {
                    if (hasOwnProperty(event.target, x)) {
                        /**
                         * @type DataAssociationMapping
                         */
                        let mapping = event.model.inferMapping(x);
                        if (mapping != null) {
                            let attribute = event.model.getAttribute(x);
                            // get only many-to-many associations
                            if (mapping.associationType === 'junction' && attribute.multiplicity === 'Many') {
                                mappings.push({
                                    name: x,
                                    mapping: mapping
                                });
                            }
                        }
                    }
                });
                if (mappings.length === 0) {
                    return callback();
                }
                async.eachSeries(mappings,
                    /**
                     * @param {{name:string,mapping:DataAssociationMapping}} x
                     * @param {function(Error=)} cb
                     */
                    function (x, cb) {
                        let silentMode = parseBoolean(event.model.$silent);
                        if (x.mapping.associationType === 'junction') {
                            let obj = event.model.convert(event.target);
                            /**
                             * @type {*|{deleted:Array}}
                             */
                            let children = obj[x.name], junction;
                            if (Array.isArray(children) === false) {
                                return cb();
                            }
                            if (x.mapping.childModel === event.model.name) {
                                let HasParentJunction = require('./has-parent-junction').HasParentJunction;
                                junction = new HasParentJunction(obj, x.mapping);
                                if (event.state === 1 || event.state === 2) {
                                    let toBeRemoved = [], toBeInserted = [];
                                    children.forEach(function (x) {
                                        if (x.$state === 4) {
                                            toBeRemoved.push(x);
                                        } else {
                                            toBeInserted.push(x);
                                        }
                                    });
                                    junction.silent(silentMode).insert(toBeInserted, function (err) {
                                        if (err) {
                                            return cb(err);
                                        }
                                        junction.silent(silentMode).remove(toBeRemoved, function (err) {
                                            if (err) {
                                                return cb(err);
                                            }
                                            return cb();
                                        });
                                    });
                                } else {
                                    return cb();
                                }
                            } else if (x.mapping.parentModel === event.model.name) {
                                if (event.state === 1 || event.state === 2) {
                                    let DataObjectJunction = require('./data-object-junction').DataObjectJunction,
                                        DataObjectTag = require('./data-object-tag').DataObjectTag;
                                    if (typeof x.mapping.childModel === 'undefined') {
                                        /**
                                         * @type {DataObjectTag}
                                         */
                                        let tags = new DataObjectTag(obj, x.mapping);
                                        return tags.silent(silentMode).all().then(function (result) {
                                            let toBeRemoved = result.filter(function (x) {
                                                return children.indexOf(x) < 0;
                                            });
                                            let toBeInserted = children.filter(function (x) {
                                                return result.indexOf(x) < 0;
                                            });
                                            if (toBeRemoved.length > 0) {
                                                return tags.silent(silentMode).remove(toBeRemoved).then(function () {
                                                    if (toBeInserted.length === 0) {
                                                        return cb();
                                                    }
                                                    return tags.silent(silentMode).insert(toBeInserted).then(function () {
                                                        return cb();
                                                    });
                                                }).catch(function (err) {
                                                    return cb(err);
                                                });
                                            }
                                            if (toBeInserted.length === 0) {
                                                return cb();
                                            }
                                            return tags.silent(silentMode).insert(toBeInserted).then(function () {
                                                return cb();
                                            });
                                        }).catch(function (err) {
                                            return cb(err);
                                        });
                                    } else {
                                        junction = new DataObjectJunction(obj, x.mapping);
                                        junction.silent(silentMode).insert(children, function (err) {
                                            if (err) {
                                                return cb(err);
                                            }
                                            let toBeRemoved = [], toBeInserted = [];
                                            children.forEach(function (x) {
                                                if (x.$state === 4) {
                                                    toBeRemoved.push(x);
                                                } else {
                                                    toBeInserted.push(x);
                                                }
                                            });
                                            junction.silent(silentMode).insert(toBeInserted, function (err) {
                                                if (err) {
                                                    return cb(err);
                                                }
                                                junction.silent(silentMode).remove(toBeRemoved, function (err) {
                                                    if (err) {
                                                        return cb(err);
                                                    }
                                                    return cb();
                                                });
                                            });
                                        });
                                    }
                                } else {
                                    cb();
                                }
                            } else {
                                cb();
                            }
                        } else {
                            cb(null);
                        }
                    }, function (err) {
                        callback(err);
                    });
            }
        } catch (err) {
            callback(err);
        }
    }
}

module.exports = {
    DataObjectAssociationListener
};

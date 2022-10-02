// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
/*eslint no-var: "off"*/
// noinspection ES6ConvertVarToLetConst

var {LangUtils, DataError} = require('@themost/common');
var _ = require('lodash');
var Q = require('q');
var async = require('async');
var {QueryField} = require('@themost/query');
var {DataAssociationMapping} = require('./types');
var {DataQueryable} = require('./data-queryable');
var {DataConfigurationStrategy} = require('./data-configuration');
var {hasOwnProperty} = require('./has-own-property');
var {isObjectDeep} = require('./is-object');

/**
 * @class
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj An object which represents the parent data object
 * @param {String|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 * @property {DataModel} baseModel - The model associated with this data object junction
 * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectJunction class.
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
function DataObjectJunction(obj, association) {

    /**
     * @property super_
     * @memberof DataObjectJunction
     * @static
     */

    /**
     * @type {DataObject}
     * @private
     */
    var _parent = obj;
    var DataModel = require('./data-model').DataModel;

    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', {
        get: function () {
            return _parent;
        }, set: function (value) {
            _parent = value;
        }, configurable: false, enumerable: false
    });
    var self = this;
    var model;
    if (typeof association === 'string') {
        //infer mapping from field name
        //set relation mapping
        if (self.parent != null) {
            model = self.parent.getModel();
            if (model != null)
                self.mapping = model.inferMapping(association);
        }
    } else if (typeof association === 'object' && association != null) {
        //get the specified mapping
        if (association instanceof DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = _.assign(new DataAssociationMapping(), association);
    }
    //get related model
    var relatedModel = this.parent.context.model(self.mapping.childModel);
    //call super class constructor
    DataObjectJunction.super_.bind(this)(relatedModel);
    //modify query (add join model)
    var adapter = relatedModel.viewAdapter;
    var left = {}, right = {};
    this.query.select(relatedModel.attributes.filter(function (x) {
        return !x.many;
    }).map(function (x) {
        return QueryField.select(x.name).from(adapter);
    }));
    /**
     * @type {DataModel}
     */
    var baseModel;
    Object.defineProperty(this, 'baseModel', {
        get: function () {
            if (baseModel)
                return baseModel;
            //get parent context
            var context = self.parent.context;
            /**
             * @type {*|DataConfigurationStrategy}
             */
            var conf = context.getConfiguration().getStrategy(DataConfigurationStrategy);
            //search in cache (configuration.current.cache)
            var modelDefinition = conf.getModelDefinition(self.mapping.associationAdapter);
            if (modelDefinition) {
                baseModel = new DataModel(modelDefinition);
                baseModel.context = self.parent.context;
                return baseModel;
            }
            //get parent and child field in order to get junction field types
            var parentModel = self.parent.getModel();
            var parentField = parentModel.field(self.mapping.parentField);
            var childModel = self.parent.context.model(self.mapping.childModel);
            var childField = childModel.field(self.mapping.childField);
            var adapter = self.mapping.associationAdapter;
            baseModel = self.parent.context.model(adapter);
            if (_.isNil(baseModel)) {
                var associationObjectField = self.mapping.associationObjectField || DataObjectJunction.DEFAULT_OBJECT_FIELD;
                var associationValueField = self.mapping.associationValueField || DataObjectJunction.DEFAULT_VALUE_FIELD;
                modelDefinition = {
                    name: adapter,
                    title: adapter,
                    source: adapter,
                    type: 'hidden',
                    hidden: true,
                    sealed: false,
                    view: adapter,
                    version: '1.0',
                    fields: [
                        {
                            name: 'id',
                            type: 'Counter',
                            primary: true
                        },
                        {
                            name: associationObjectField,
                            indexed: true,
                            nullable: false,
                            type: self.mapping.parentModel,
                            mapping: {
                                associationType: 'association',
                                parentModel: self.mapping.parentModel,
                                parentField: self.mapping.parentField,
                                childModel: adapter,
                                childField: associationObjectField,
                            }
                        },
                        {
                            name: associationValueField,
                            indexed: true,
                            nullable: false,
                            type: self.mapping.childModel,
                            mapping: {
                                associationType: 'association',
                                parentModel: self.mapping.childModel,
                                parentField: self.mapping.childField,
                                childModel: adapter,
                                childField: associationValueField,
                            }
                        }
                    ],
                    'constraints': [
                        {
                            'description': 'The relation between two objects must be unique.',
                            'type': 'unique',
                            'fields': [associationObjectField, associationValueField]
                        }
                    ],
                    'privileges': self.mapping.privileges || [
                        {
                            'mask': 15,
                            'type': 'global'
                        },
                        {
                            'mask': 15,
                            'type': 'global',
                            'account': 'Administrators'
                        }
                    ]
                };
                if (self.mapping.refersTo) {
                    var refersTo = parentModel.getAttribute(self.mapping.refersTo);
                    if (refersTo && (refersTo.multiplicity === 'ZeroOrOne' || refersTo.multiplicity === 'One')) {
                        modelDefinition.constraints[0].fields = [associationObjectField];
                    }
                }
                conf.setModelDefinition(modelDefinition);
                //initialize base model
                baseModel = new DataModel(modelDefinition);
                baseModel.context = self.parent.context;
            }
            return baseModel;
        }, configurable: false, enumerable: false
    });

    /**
     * Gets an instance of DataModel class which represents the data adapter of this association
     * @returns {DataModel}
     */
    this.getBaseModel = function () {
        return this.baseModel;
    };

    left[adapter] = [relatedModel.primaryKey];
    var baseAdapter = this.getBaseModel().viewAdapter;
    right[baseAdapter] = [QueryField.select(this.getValueField()).from(baseAdapter).$name];
    var field1 = QueryField.select(this.getObjectField()).from(baseAdapter).$name;
    this.query.join(baseAdapter, []).with([left, right]).where(field1).equal(obj[this.mapping.parentField]).prepare();

}

DataObjectJunction.DEFAULT_OBJECT_FIELD = 'parentId';
DataObjectJunction.DEFAULT_VALUE_FIELD = 'valueId';

LangUtils.inherits(DataObjectJunction, DataQueryable);

/**
 * @returns {string}
 */
DataObjectJunction.prototype.getObjectField = function () {
    var self = this;
    // get base model
    var baseModel = this.getBaseModel();
    // if association parent field is defined use this
    if (self.mapping && self.mapping.associationObjectField) {
        return self.mapping.associationObjectField;
    }
    // if base model has the traditional parent attribute
    var attr = _.find(baseModel.attributes, function (x) {
        return x.name === DataObjectJunction.DEFAULT_OBJECT_FIELD;
    });
    if (attr) {
        return attr.name;
    }
    // else try to find parent model definition
    attr = _.find(baseModel.attributes, function (x) {
        return self.mapping && (x.type === self.mapping.parentModel);
    });
    if (attr) {
        return attr.name;
    }
    return DataObjectJunction.DEFAULT_OBJECT_FIELD;
};

/**
 * @returns {string}
 */
DataObjectJunction.prototype.getValueField = function () {
    var self = this;
    // get base model
    var baseModel = this.getBaseModel();
    // if association child field is defined use this
    if (self.mapping && self.mapping.associationValueField) {
        return self.mapping.associationValueField;
    }
    // if base model has the traditional parent attribute
    var attr = _.find(baseModel.attributes, function (x) {
        return x.name === DataObjectJunction.DEFAULT_VALUE_FIELD;
    });
    if (attr) {
        return attr.name;
    }
    // else try to find parent model definition
    attr = _.find(baseModel.attributes, function (x) {
        return self.mapping && (x.type === self.mapping.childModel);
    });
    if (attr) {
        return attr.name;
    }
    return DataObjectJunction.DEFAULT_VALUE_FIELD;
};

/**
 * Migrates the underlying data association adapter.
 * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 */
DataObjectJunction.prototype.migrate = function (callback) {
    var self = this;
    var model = this.getBaseModel();
    model.migrate(function (err) {
        if (err) {
            return callback(err);
        }
        //migrate related model
        var childModel = self.parent.context.model(self.mapping.childModel);
        return childModel.migrate(callback);
    });
};
/**
 * Overrides DataQueryable.execute() method
 * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 * @ignore
 */
DataObjectJunction.prototype.execute = function (callback) {
    var self = this;
    self.migrate(function (err) {
        if (err) {
            callback(err);
            return;
        }
        // noinspection JSPotentiallyInvalidConstructorUsage
        DataObjectJunction.super_.prototype.execute.call(self, callback);
    });
};

/**
 * Overrides DataQueryable.count() method
 * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 * @ignore
 */
DataObjectJunction.prototype.count = function (callback) {
    var self = this;
    if (typeof callback === 'undefined') {
        return new Promise(function (resolve, reject) {
            return self.migrate(function (err) {
                if (err) {
                    return reject(err);
                }
                // noinspection JSPotentiallyInvalidConstructorUsage
                var superCount = DataObjectJunction.super_.prototype.count.bind(self);
                return superCount().then(function (result) {
                    return resolve(result);
                }).catch(function (err) {
                    return reject(err);
                });
            });
        });
    }
    return self.migrate(function (err) {
        if (err) {
            return callback(err);
        }
        // noinspection JSPotentiallyInvalidConstructorUsage
        var superCount = DataObjectJunction.super_.prototype.count.bind(self);
        return superCount(callback);
    });
};

/**
 * @this DataObjectJunction
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
function insertAnyObject(obj, callback) {
    var self = this;
    var arr = Array.isArray(obj) ? obj : [ obj ];
    self.migrate(function (err) {
        if (err)
            callback(err);
        else {
            async.eachSeries(arr, function (item, cb) {
                var child;
                // try to find if object is a single value e.g. a number
                if (isObjectDeep(item) === false) {
                    child = {};
                    // and set object key e.g. { "id": 1102 }
                    Object.assign(child, self.mapping.childField, {
                        configurable: true,
                        enumerable: true,
                        value: item
                    });
                } else {
                    // otherwise get object
                    child = item;
                }
                // validate if child key exists
                if (hasOwnProperty(child, self.mapping.childField)) {
                    return insertSingleObject.call(self, child, function (err) {
                        return cb(err);
                    });
                }
                // get child model
                var childModel = self.parent.context.model(self.mapping.childModel);
                // and silent state
                var isSilent = !!self.$silent;
                // try to find object
                return childModel.find(child).silent(isSilent).select(self.mapping.childField).value().then(function(result) {
                    if (result == null) {
                        return cb(new DataError('E_ASSOCIATION', 'An associated object cannot be found', null, self.mapping.childModel, self.mapping.childField));
                    }
                    // set value
                    Object.defineProperty(child, self.mapping.childField, {
                        configurable: true,
                        enumerable: true,
                        value: result
                    });
                    return insertSingleObject.call(self, child, function(err) {
                       return cb(err);
                    });
                }).catch(function(err) {
                    return cb(err);
                });
            }, function(err) {
                return callback(err);
            });
        }
    });
}

/**
 * Inserts an association between parent object and the given object or array of objects.
 * @param {*} obj - An object or an array of objects to be related with parent object
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 */
DataObjectJunction.prototype.insert = function (obj, callback) {
    var self = this;
    if (typeof callback === 'undefined') {
        return Q.Promise(function (resolve, reject) {
            return insertAnyObject.call(self, obj, function (err) {
                if (err) {
                    return reject(err);
                }
                return resolve(obj);
            });
        });
    }
    return insertAnyObject.call(self, obj, function (err) {
        if (err) {
            return callback(err);
        }
        return callback(null, obj);
    });
};

/**
 * @this DataObjectJunction
 * @param {Function} callback
 * @private
 */
function clear_(callback) {
    var self = this;
    // auto migrate
    self.migrate(function (err) {
        if (err) {
            return callback();
        }
        // get parent id
        var parentValue = self.parent[self.mapping.parentField];
        // get relation model
        var baseModel = self.getBaseModel();
        // validate relation existence
        baseModel.where(self.getObjectField()).equal(parentValue).all(function (err, result) {
            // if error occurred
            if (err) {
                return callback();
            }
            // if there are no items
            if (result.length === 0) {
                // return
                return callback();
            }
            // otherwise remove items
            baseModel.remove(result, callback);
        });
    });
}

/**
 * @param callback
 * @returns {Promise<T>|*}
 */
DataObjectJunction.prototype.removeAll = function (callback) {
    var self = this;
    if (typeof callback === 'undefined') {
        return Q.Promise(function (resolve, reject) {
            return clear_.call(self, function (err) {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
    return clear_.call(self, callback);
};

/**
 * @this DataObjectJunction
 * Inserts a new relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
function insertSingleObject(obj, callback) {
    var self = this;
    //get parent and child
    var child = obj;
    if (typeof obj !== 'object') {
        child = {};
        child[self.mapping.childField] = obj;
    }
    var parentValue = self.parent[self.mapping.parentField];
    var childValue = child[self.mapping.childField];
    //get relation model
    var baseModel = self.getBaseModel();
    //validate relation existence
    var objectField = self.getObjectField();
    var valueField = self.getValueField();
    baseModel.silent(self.$silent).where(objectField).equal(parentValue).and(valueField).equal(childValue).first(function (err, result) {
        if (err) {
            //on error exit with error
            return callback(err);
        } else {
            if (result) {
                //if relation already exists, do nothing
                return callback(null);
            } else {
                //otherwise create new item
                var newItem = {};
                newItem[objectField] = parentValue;
                newItem[valueField] = childValue;
                // set silent flag
                //and insert it
                baseModel.silent(self.$silent).insert(newItem, callback);
            }
        }
    });
}

/**
 * Migrates current junction data storage
 * @param {Function} callback
 */
DataObjectJunction.prototype.migrate = function (callback) {
    var self = this;
    //get migration model
    var migrationModel = self.parent.context.model('Migration');
    //get related model
    var relationModel = self.getBaseModel();
    migrationModel.find({
        appliesTo: relationModel.source,
        version: relationModel.version
    }).first(function (err, result) {
        if (err) {
            callback(err);
        } else {
            if (!result) {
                //migrate junction table
                relationModel.migrate(function (err) {
                    if (err) {
                        callback(err);
                    } else
                        callback(null);
                })
            } else
                callback(null);
        }
    });
};

/**
 * @return Promise<void>
 */
DataObjectJunction.prototype.migrateAsync = function () {
    var self = this;
    return new Promise(function(resolve, reject) {
        self.migrate(function (err) {
            if (err) {
                return reject(err);
            }
            return resolve();
        });
    });
}

/**
 * @this DataObjectJunction
 * @param obj
 * @param callback
 * @private
 */
function removeAnyObject(obj, callback) {
    var self = this;
    var arr = Array.isArray(obj) ? obj : [ obj ];
    self.migrate(function (err) {
        if (err)
            callback(err);
        else {
            async.eachSeries(arr, function (item, cb) {
                var child;
                // try to find if object is a single value e.g. a number
                if (isObjectDeep(item) === false) {
                    child = {};
                    // and set object key e.g. { "id": 1102 }
                    Object.assign(child, self.mapping.childField, {
                        configurable: true,
                        enumerable: true,
                        value: item
                    });
                } else {
                    // otherwise get object
                    child = item;
                }
                if (hasOwnProperty(child, self.mapping.childField)) {
                    return removeSingleObject.call(self, child, function (err) {
                        return cb(err);
                    });
                }
                // get child model
                var childModel = self.parent.context.model(self.mapping.childModel);
                // and silent state
                var isSilent = !!self.$silent;
                // find object by querying child object
                childModel.find(child).silent(isSilent).select(self.mapping.childField).value().then(function(result) {
                    if (result == null) {
                        return cb(new DataError('E_ASSOCIATION', 'An associated object cannot be found', null, self.mapping.childModel, self.mapping.childField));
                    }
                    // set value
                    Object.defineProperty(child, self.mapping.childField, {
                        configurable: true,
                        enumerable: true,
                        value: result
                    });
                    return removeSingleObject.call(self, child, function(err) {
                        return cb(err);
                    });

                }).catch(function (err) {
                   return cb(err);
                });
            }, callback);
        }
    });
}

/**
 * Removes the association between parent object and the given object or array of objects.
 * @param {*} obj - An object or an array of objects to be disconnected from parent object
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 */
DataObjectJunction.prototype.remove = function (obj, callback) {
    var self = this;
    if (typeof callback === 'undefined') {
        return new Promise(function (resolve, reject) {
            return removeAnyObject.call(self, obj, function (err) {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
    return removeAnyObject.call(self, obj, callback);
};

/**
 * @this DataObjectJunction
 * Removes a relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
function removeSingleObject(obj, callback) {
    var self = this;
    //get parent and child
    var child = obj;
    if (typeof obj !== 'object') {
        child = {};
        child[self.mapping.childField] = obj;
    }
    var parentValue = self.parent[self.mapping.parentField];
    var childValue = child[self.mapping.childField];
    //get relation model
    var baseModel = self.getBaseModel();
    baseModel.silent(self.$silent).where(self.getObjectField()).equal(parentValue).and(self.getValueField()).equal(childValue).first(function (err, result) {
        if (err) {
            callback(err);
        } else {
            if (!result) {
                callback(null);
            } else {
                //otherwise remove item
                baseModel.silent(self.$silent).remove(result, callback);
            }
        }
    });
}

module.exports = {
    DataObjectJunction
}

// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
/*eslint no-var: "off"*/
// noinspection ES6ConvertVarToLetConst

var {LangUtils, DataError} = require('@themost/common');
var async = require('async');
var {QueryField} = require('@themost/query');
var {DataAssociationMapping} = require('./types');
var {DataConfigurationStrategy} = require('./data-configuration');
var {DataQueryable} = require('./data-queryable');
var {DataObjectJunction} = require('./data-object-junction');
var {hasOwnProperty} = require('./has-own-property');
const {isObjectDeep} = require('./is-object');
/**
 * @class
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj The parent data object reference
 * @param {string|*} association - A string that represents the name of the field which holds association mapping or the association mapping itself.
 * @property {DataModel} baseModel - The model associated with this data object junction
 * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectJunction class.
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
function HasParentJunction(obj, association) {
    var self = this;
    /**
     * @type {DataObject}
     * @private
     */
    var _parent = obj;
    /**
     * @type {DataModel}
     */
    var _model;
    var DataModel = require('./data-model').DataModel;
    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return _parent;
    }, set: function (value) {
        _parent = value;
    }, configurable: false, enumerable: false});

    //get association mapping
    if (typeof association === 'string') {
        if (_parent) {
            _model = _parent.getModel();
            if (_model!==null)
                self.mapping = _model.inferMapping(association);
        }
    }
    else if (typeof association === 'object' && association !== null) {
        //get the specified mapping
        if (association instanceof DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = Object.assign(new DataAssociationMapping(), association);
    }
    var relatedModel = this.parent.context.model(self.mapping.parentModel);
    //call super class constructor
    HasParentJunction.super_.call(this, relatedModel);
    //modify query (add join model)
    var adapter = relatedModel.viewAdapter;
    var left = {}, right = {};
    this.query.select(relatedModel.attributes.filter(function(x) {
        return !x.many;
    }).map(function(x) {
        return QueryField.select(x.name).from(adapter);
    }));

    var baseModel;
    Object.defineProperty(this, 'baseModel', {
        get: function() {
            if (baseModel)
                return baseModel;
            /**
             * @type {*|DataConfigurationStrategy}
             */
            var conf = self.parent.context.getConfiguration().getStrategy(DataConfigurationStrategy);
            //search in cache (configuration.current.cache)
            if (conf.getModelDefinition(self.mapping.associationAdapter)) {
                baseModel = new DataModel(conf.getModelDefinition(self.mapping.associationAdapter));
                baseModel.context = self.parent.context;
                return baseModel;
            }
            // otherwise, create model
            var parentModel = self.parent.getModel();
            var childModel = self.parent.context.model(self.mapping.childModel);
            var adapter = self.mapping.associationAdapter;
            baseModel = self.parent.context.model(adapter);
            if (baseModel == null) {
                var associationObjectField = self.mapping.associationObjectField || DataObjectJunction.DEFAULT_OBJECT_FIELD ;
                var associationValueField = self.mapping.associationValueField || DataObjectJunction.DEFAULT_VALUE_FIELD;
                var modelDefinition = { name:adapter, title: adapter, sealed:false, hidden:true, type:'hidden', source:adapter, view:adapter, version:'1.0', fields:[
                        {
                            name: 'id',
                            type:'Counter',
                            primary: true
                        },
                        {
                            name: associationObjectField,
                            indexed: true,
                            nullable:false,
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
                            nullable:false,
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
                    constraints: [
                        {
                            description: 'The relation between two objects must be unique.',
                            type:'unique',
                            fields: [ associationObjectField, associationValueField ]
                        }
                    ], 'privileges': self.mapping.privileges || [
                        {
                            'mask':15,
                            'type':'global'
                        },
                        { 'mask':15,
                            'type':'global',
                            'account': 'Administrators'
                        }
                    ]};
                // add unique constraint if child model mapping is Zero Or One
                var attribute = parentModel.attributes.filter(function (x) {
                    return x.type === childModel.name;
                }).filter(function (y) {
                    var mapping = parentModel.inferMapping(y.name);
                    return mapping && mapping.associationAdapter === adapter;
                });
                if (attribute) {
                    if (attribute && (attribute.multiplicity === 'ZeroOrOne' || attribute.multiplicity === 'One')) {
                        modelDefinition.constraints[0].fields = [associationObjectField];
                    }
                }

                conf.setModelDefinition(modelDefinition);
                //initialize base model
                baseModel = new DataModel(modelDefinition);
                baseModel.context = self.parent.context;
            }
            return baseModel;
        },configurable:false, enumerable:false
    });

    /**
     * @method
     * @description Gets an instance of DataModel class which represents the data adapter of this association
     * @name HasParentJunction#getBaseModel
     * @returns {DataModel}
     */

    /**
     * Gets an instance of DataModel class which represents the data adapter of this association
     * @returns {DataModel}
     */
    this.getBaseModel = function() {
        return this.baseModel;
    };
    // get association adapter
    var associationAdapter = self.mapping.associationAdapter;
    // get parent field
    var parentField = QueryField.select(this.getObjectField()).from(associationAdapter).$name;
    // get child field
    var childField = QueryField.select(this.getValueField()).from(associationAdapter).$name;
    // set left operand of join expression
    left[adapter] = [ this.mapping.parentField ];
    // set right operand of join expression
    right[associationAdapter] = [parentField];
    // apply native join expression to query
    this.query.join(this.mapping.associationAdapter, []).with([left, right]).where(childField).equal(obj[this.mapping.childField]).prepare();

}
LangUtils.inherits(HasParentJunction, DataQueryable);

/**
 * @returns {string}
 */
HasParentJunction.prototype.getObjectField = function() {
    return DataObjectJunction.prototype.getObjectField.bind(this)();
};

/**
 * @returns {string}
 */
HasParentJunction.prototype.getValueField = function() {
    return DataObjectJunction.prototype.getValueField.bind(this)();
};

/**
 * @this HasParentJunction
 * Inserts a new association between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
function insertSingleObject(obj, callback) {
    var self = this;
    //get parent and child
    var parent = obj;
    if (typeof obj !== 'object') {
        parent = {};
        parent[self.mapping.parentField] = obj;
    }
    var parentValue = parent[self.mapping.parentField];
    var childValue = self.parent[self.mapping.childField];
    //validate relation existence
    self.baseModel.silent(self.$silent).where(self.getObjectField()).equal(parentValue).and(self.getValueField()).equal(childValue).first(function(err, result) {
        if (err) {
            //on error exit with error
            return callback(err);
        }
        else {
            if (result) {
                //if relation already exists, do nothing
                return callback();
            }
            else {
                //otherwise, create new item
                var newItem = { };
                newItem[self.getObjectField()] = parentValue;
                newItem[self.getValueField()] = childValue;
                //and insert it
                self.baseModel.silent(self.$silent).insert(newItem, callback);
            }
        }
    });
}

/**
 * @this HasParentJunction
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
function insertAnyObject(obj, callback) {
    var self = this;
    var arr = Array.isArray(obj) ? obj : [ obj ];
    self.migrate(function(err) {
        if (err)
            callback(err);
        else {
            async.eachSeries(arr, function(item, cb) {
                var parent;
                // try to find if object is a single value e.g. a number
                if (isObjectDeep(item) === false) {
                    parent = {};
                    // and set object key e.g. { "id": 1102 }
                    Object.assign(parent, self.mapping.parentField, {
                        configurable: true,
                        enumerable: true,
                        value: item
                    });
                } else {
                    // otherwise get object
                    parent = item;
                }
                //validate if child identifier exists
                if (hasOwnProperty(parent, self.mapping.parentField)) {
                    return insertSingleObject.call(self, parent, function(err) {
                        cb(err);
                    });
                }
                else {
                    // get related model
                    var relatedModel = self.parent.context.model(self.mapping.parentModel);
                    // ensure silent mode
                    var isSilent = !!self.$silent;
                    // find object by querying child object
                    return relatedModel.find(item).select(self.mapping.parentField).silent(isSilent).value().then(function(result) {
                        if (result == null) {
                            return cb(new DataError('E_ASSOCIATION', 'An associated object cannot be found', null, self.mapping.parentModel, self.mapping.parentField));
                        }
                        // set value
                        Object.defineProperty(parent, self.mapping.parentField, {
                            configurable: true,
                            enumerable: true,
                            value: result
                        });
                        return insertSingleObject.call(self, parent, function(err) {
                            cb(err);
                        });
                    }).catch(function (err) {
                        return cb(err);
                    });
                }
            }, callback);
        }
    });
}

/**
 * Inserts an association between parent object and the given object or array of objects.
 * @param {*|Array} obj - An object or an array of objects to be related with parent object
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 */
HasParentJunction.prototype.insert = function(obj, callback) {
    var self = this;
    if (typeof callback === 'undefined') {
        return new Promise(function(resolve, reject) {
            return insertAnyObject.bind(self)(obj, function(err) {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
    return insertAnyObject.bind(self)(obj, function(err) {
        return callback(err);
    });
};

/**
 * @this HasParentJunction
 * Removes a relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
function removeSingleObject(obj, callback) {
    var self = this;
    //get parent and child
    var parent = obj;
    if (typeof obj !== 'object') {
        parent = {};
        parent[self.mapping.parentField] = obj;
    }
    var parentValue = parent[self.mapping.parentField];
    if (parentValue == null) {
        return callback(new DataError('E_PAREN_NULL', 'Parent object identifier cannot be empty', null, self.mapping.parentModel, self.mapping.parentField));
    }
    var childValue = self.parent[self.mapping.childField];
    if (childValue == null) {
        return callback(new DataError('E_CHILD_NULL', 'Child object identifier cannot be empty', null, self.mapping.childModel, self.mapping.childField));
    }
    // get silent mode
    var isSilent = !!self.$silent;
    //get relation model
    self.baseModel.silent(isSilent).where(this.getObjectField()).equal(parentValue)
        .and(this.getValueField()).equal(childValue).getItem().then(function(result) {
            if (result == null) {
                return callback(new DataError('E_NOT_ASSOC', 'The association cannot be found or access is denied', null, self.baseModel.name));
            }
            // otherwise, remove item
            return self.baseModel.silent(isSilent).remove(result, callback);
    }).catch(function(err) {
        return callback(err);
    });
}

/**
 * @this HasParentJunction
 * @param obj
 * @param callback
 * @private
 */
function removeAnyObject(obj, callback) {
    var self = this;
    var arr = Array.isArray(obj) ? obj : [ obj ];
    self.migrate(function(err) {
        if (err)
            callback(err);
        else
        {
            async.eachSeries(arr, function(item, cb) {
                var parent;
                // try to find if object is a single value e.g. a number
                if (isObjectDeep(item) === false) {
                    parent = {};
                    // and set object key e.g. { "id": 1102 }
                    Object.assign(parent, self.mapping.parentField, {
                        configurable: true,
                        enumerable: true,
                        value: item
                    });
                } else {
                    // otherwise get object
                    parent = item;
                }
                if (hasOwnProperty(parent, self.mapping.parentField)) {
                    return removeSingleObject.call(self, parent, function (err) {
                        return cb(err);
                    });
                }
                // get related model
                var relatedModel = self.parent.context.model(self.mapping.parentModel);
                // get silent mode
                var isSilent = !!self.$silent;
                // find object
                relatedModel.find(parent).silent(isSilent).select(self.mapping.parentField).value().then(function(result) {
                    if (result == null) {
                        return cb(new DataError('E_ASSOCIATION', 'An associated object cannot be found', null, self.mapping.parentModel, self.mapping.parentField));
                    }
                    // set value
                    Object.defineProperty(parent, self.mapping.parentField, {
                        configurable: true,
                        enumerable: true,
                        value: result
                    });
                    return removeSingleObject.call(self, parent, function(err) {
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
 * @param {*|Array} obj - An object or an array of objects to be disconnected from parent object
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 */
HasParentJunction.prototype.remove = function(obj, callback) {
    var self = this;
    if (typeof callback === 'undefined') {
        return new Promise(function(resolve, reject) {
            return removeAnyObject.bind(self)(obj, function(err) {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
    return removeAnyObject.bind(self)(obj, function(err) {
        return callback(err);
    });
};


HasParentJunction.prototype.migrate = function(callback) {
    this.baseModel.migrate(callback);
};

/**
 * @return Promise<void>
 */
HasParentJunction.prototype.migrateAsync = function () {
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
 * Overrides DataQueryable.count() method
 * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 * @ignore
 */
HasParentJunction.prototype.count = function(callback) {
    var self = this;
    if (typeof callback === 'undefined') {
        return new Promise(function(resolve, reject) {
            return self.migrate(function(err) {
                if (err) {
                    return reject(err);
                }
                // noinspection JSPotentiallyInvalidConstructorUsage
                var superCount = HasParentJunction.super_.prototype.count.bind(self);
                return superCount().then(function(result) {
                    return resolve(result);
                }).catch(function(err) {
                    return reject(err);
                });
            });
        });
    }
    return self.migrate(function(err) {
        if (err) {
            return callback(err);
        }
        // noinspection JSPotentiallyInvalidConstructorUsage
        var superCount = HasParentJunction.super_.prototype.count.bind(self);
        return superCount(callback);
    });
};

/**
 * @returns {Promise<T>|*}
 */
HasParentJunction.prototype.removeAll = function () {
    var self = this;
    return self.migrateAsync().then(function () {
        // get child id
        var childValue = self.parent[self.mapping.childField];
        if (childValue == null) {
            throw new DataError('E_ASSOCIATION', 'Associated attribute value cannot be empty at this context', null, self.mapping.childModel, self.mapping.childField);
        }
        // get relation model
        var baseModel = self.getBaseModel();
        // validate relation existence
        return baseModel.where(self.getValueField()).equal(childValue).getAllItems().then(function (result) {
            // if there are no items
            if (result.length === 0) {
                return Promise.resolve();
            }
            // otherwise remove items
            return baseModel.remove(result);
        });
    });
};

module.exports = {
    HasParentJunction
};

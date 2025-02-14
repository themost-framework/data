// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
/*eslint no-var: "off"*/
// noinspection ES6ConvertVarToLetConst

var {LangUtils, DataError, Args} = require('@themost/common');
var {DataConfigurationStrategy} = require('./data-configuration');
var {QueryField} = require('@themost/query');
var _ = require('lodash');
var { DataAssociationMapping } = require('./types');
var {DataObjectJunction} = require('./data-object-junction');
var {DataQueryable} = require('./data-queryable');
var {isObjectDeep} = require('./is-object');

/**
 * @class
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj An object which represents the parent data object
 * @param {String|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 * @property {DataModel} baseModel - The model associated with this data object junction
 * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectTag class.
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
function DataObjectTag(obj, association) {

    /**
     * @property parent
     * @memberOf DataObjectTag
     * @type {DataObject}
     */

    /**
     * @type {DataObject}
     * @private
     */
    var _parent = obj;
    var model;
    var DataModel = require('./data-model').DataModel;

    Object.defineProperty(this, 'parent', { get: function () {
        return _parent;
    }, set: function (value) {
        _parent = value;
    }, configurable: false, enumerable: false});
    var self = this;
    if (typeof association === 'string') {
        //infer mapping from field name
        //set relation mapping
        if (self.parent != null) {
            model = self.parent.getModel();
            if (model != null)
                self.mapping = model.inferMapping(association);
        }
    } else if (isObjectDeep(association)) {
        //get the specified mapping
        if (association instanceof DataAssociationMapping) {
            self.mapping = association;
        } else {
            self.mapping = _.assign(new DataAssociationMapping(), association);
        }
    }
    Args.check(self.mapping != null, new DataError('E_MAPPING', 'DataObjectTag.mapping cannot be empty at this context', null))

    //validate mapping
    var _baseModel;
    Object.defineProperty(this, 'baseModel', {
        get: function() {
            if (_baseModel)
                return _baseModel;
            //get parent context
            var context = self.parent.context;
            /**
             * @type {DataConfigurationStrategy}
             */
            var strategy = context.getConfiguration().getStrategy(DataConfigurationStrategy);
            var definition = strategy.getModelDefinition(self.mapping.associationAdapter);
            if (_.isNil(definition)) {
                var associationObjectField = self.mapping.associationObjectField || DataObjectTag.DEFAULT_OBJECT_FIELD;
                var associationValueField = self.mapping.associationValueField || DataObjectTag.DEFAULT_VALUE_FIELD;
                var parentModel = self.parent.getModel();
                // get value type
                var refersTo = context.model(self.mapping.parentModel).getAttribute(self.mapping.refersTo);
                var refersToType = (refersTo && refersTo.type) || 'Text';
                var objectFieldType = self.mapping.parentModel;
                definition = {
                    'name': self.mapping.associationAdapter,
                    'hidden': true,
                    'source': self.mapping.associationAdapter,
                    'view': self.mapping.associationAdapter,
                    'version': '1.0',
                    'fields': [
                        {
                            'name': 'id',
                            'type': 'Counter',
                            'nullable': false,
                            'primary': true
                        },
                        {
                            'name': associationObjectField,
                            'type': objectFieldType,
                            'nullable': false,
                            'many': false,
                            'indexed': true
                        },
                        {
                            'name': associationValueField,
                            'type': refersToType,
                            'nullable': false,
                            'many': false,
                            'indexed': true
                        }
                    ],
                    'constraints': [
                        { 'type':'unique', 'fields': [ associationObjectField, associationValueField ] }
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

                if (refersTo.size) {
                    var attribute = definition.fields.find(function(item) {
                       return item.name === associationValueField;
                    });
                    if (attribute) {
                        Object.assign(attribute, {
                            size: refersTo.size
                        });
                    }
                }

                strategy.setModelDefinition(definition);
            }
            _baseModel = new DataModel(definition);
            _baseModel.context = self.parent.context;
            return _baseModel;
        },configurable:false, enumerable:false
    });

    /**
     * Gets an instance of DataModel class which represents the data adapter of this association
     * @returns {DataModel}
     */
    this.getBaseModel = function() {
        return this.baseModel;
    };

    // call super class constructor
    DataObjectTag.super_.call(this, self.getBaseModel());
    // add select
    this.select(this.getValueField()).asArray();
    // modify query (add join parent model)
    var left = {}, right = {};
    // get parent adapter
    var parentAdapter = self.parent.getModel().viewAdapter;
    // set left operand of native join expression
    left[ parentAdapter ] = [ this.mapping.parentField ];
    // set right operand of native join expression
    right[this.mapping.associationAdapter] = [ QueryField.select(this.getObjectField()).from(this.mapping.associationAdapter).$name ];
    var field1 = QueryField.select(this.getObjectField()).from(this.mapping.associationAdapter).$name;
    // apply join expression
    this.query.join(parentAdapter, []).with([left, right]).where(field1).equal(obj[this.mapping.parentField]).prepare(false);
}

LangUtils.inherits(DataObjectTag, DataQueryable);

DataObjectTag.DEFAULT_OBJECT_FIELD = 'object';
DataObjectTag.DEFAULT_VALUE_FIELD = 'value';

/**
 * @returns {string}
 */
DataObjectTag.prototype.getObjectField = function() {
    return DataObjectJunction.prototype.getObjectField.bind(this)();
};

/**
 * @returns {string}
 */
DataObjectTag.prototype.getValueField = function() {
    return DataObjectJunction.prototype.getValueField.bind(this)();
};

/**
 * Migrates the underlying data association adapter.
 * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 */
DataObjectTag.prototype.migrate = function(callback) {
    this.getBaseModel().migrate(callback);
};

/**
 * @return Promise<void>
 */
DataObjectTag.prototype.migrateAsync = function () {
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
DataObjectTag.prototype.count = function(callback) {
    var self = this;
    if (typeof callback === 'undefined') {
        return new Promise(function(resolve, reject) {
            return self.migrate(function(err) {
                if (err) {
                    return reject(err);
                }
                // noinspection JSPotentiallyInvalidConstructorUsage
                var superCount = DataObjectTag.super_.prototype.count.bind(self);
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
        var superCount = DataObjectTag.super_.prototype.count.bind(self);
        return superCount(callback);
    });
};

/**
 * Overrides DataQueryable.execute() method
 * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 * @ignore
 */
DataObjectTag.prototype.execute = function(callback) {
    var self = this;
    self.migrate(function(err) {
        if (err) { return callback(err); }
        // noinspection JSPotentiallyInvalidConstructorUsage
        DataObjectTag.super_.prototype.execute.bind(self)(callback);
    });
};

/**
 * @this DataObjectTag
 * @param obj
 * @param callback
 * @private
 */
function _insert(obj, callback) {
    var self = this;
    var values = Array.isArray(obj) ? obj : [ obj ];
    self.migrate(function(err) {
        if (err) {
            return callback(err);
        }
        // get object field name
        var objectField = self.getObjectField();
        // get value field name
        var valueField = self.getValueField();
        // map the given items
        var items = _.map(_.filter(values, function(x) {
            return !_.isNil(x);
        }), function (x) {
            var res = {};
            res[objectField] = self.parent[self.mapping.parentField];
            res[valueField] = x;
            return res;
        });
        var silentMode = self.isSilent();
        // and finally save items
        return self.getBaseModel().silent(silentMode).save(items).then(function() {
            return callback();
        }).catch(function(err) {
            return callback(err);
        });
    });
}

/**
 * Inserts an array of values
 * @param {*} item
 * @param {Function=} callback
 */
DataObjectTag.prototype.insert = function(item, callback) {
    var self = this;
    if (typeof callback === 'undefined') {
        return new Promise(function (resolve, reject) {
            return _insert.bind(self)(item, function(err) {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
    return _insert.call(self, item, callback);
};

/**
 * @this DataObjectTag
 * @param callback
 * @private
 */
function _removeAll(callback) {
    var self = this;
    return self.migrateAsync().then(function() {
        var silentMode = self.isSilent();
        var objectField = self.getObjectField();
        return self.getBaseModel().silent(silentMode)
            .where(objectField).equal(self.parent[self.mapping.parentField])
            .select('id')
            .getAllItems().then(function(result) {
                if (result.length === 0) {
                    return Promise.resolve();
                }
                return self.getBaseModel().remove(result);
        });
    }).then(function() {
        return callback();
    }).catch(function(err) {
        return callback(err);
    });
}

/**
 * Removes all values
 * @param {Function=} callback
 * @returns Promise<T>|*
 */
DataObjectTag.prototype.removeAll = function(callback) {
    var self = this;
    if (typeof callback !== 'function') {
        return new Promise(function (resolve, reject) {
            return _removeAll.bind(self)(function(err) {
                if (err) { return reject(err); }
                return resolve();
            });
        });
    }
    else {
        return _removeAll.call(self, callback);
    }
};

/**
 * @this DataObjectTag
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
function _remove(obj, callback) {
    var self = this;
    var values = Array.isArray(obj) ? obj : [ obj ];
    self.migrate(function(err) {
        if (err) {
            return callback(err);
        }
        // get object field name
        var objectField = self.getObjectField();
        // get value field name
        var valueField = self.getValueField();
        var items = _.map(_.filter(values, function(x) {
            return !_.isNil(x);
        }), function (x) {
            var res = {};
            res[objectField] = self.parent[self.mapping.parentField];
            res[valueField] = x;
            return res;
        });
        var silentMode = self.isSilent();
        return self.getBaseModel().silent(silentMode).remove(items, callback);
    });
}

/**
 * Removes a value or an array of values
 * @param {Array|*} item
 * @param {Function=} callback
 * @returns Promise<T>|*
 */
DataObjectTag.prototype.remove = function(item, callback) {
    var self = this;
    if (typeof callback !== 'function') {
        return new Promise(function (resolve, reject) {
            return _remove.bind(self)(item, function(err) {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
    return _remove.call(self, item, callback);
};

module.exports = {
    DataObjectTag
};

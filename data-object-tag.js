// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const {DataConfigurationStrategy} = require('./data-configuration');
const {QueryField, QueryUtils} = require('@themost/query');
const _ = require('lodash');
const Q = require('q');
const {DataAssociationMapping} = require('./types');
const {DataObjectJunction} = require('./data-object-junction');
const {DataQueryable} = require('./data-queryable');

/**
 * @classdesc Represents a collection of values associated with a data object e.g. a collection of tags of an article, a set of skills of a person etc.
 * @class
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj An object which represents the parent data object
 * @param {String|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 * @property {DataModel} baseModel - The model associated with this data object junction
 * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectTag class.
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
class DataObjectTag extends DataQueryable {
    constructor(obj, association) {
        super();
        /**
         * @type {DataObject}
         * @private
         */
        let parent_ = obj;
        let model;
        let DataModel = require('./data-model').DataModel;

        /**
         * Gets or sets the parent data object
         * @type DataObject
         */
        Object.defineProperty(this, 'parent', {
            get: function () {
                return parent_;
            }, set: function (value) {
                parent_ = value;
            }, configurable: false, enumerable: false
        });
        let self = this;
        if (typeof association === 'string') {
            //infer mapping from field name
            //set relation mapping
            if (self.parent != null) {
                model = self.parent.getModel();
                if (model != null) {
                    self.mapping = model.inferMapping(association);
                }
            }
        } else if (typeof association === 'object' && association != null) {
            //get the specified mapping
            if (association instanceof DataAssociationMapping) {
                self.mapping = association;
            } else {
                self.mapping = _.assign(new DataAssociationMapping(), association);
            }
        }
        //validate mapping
        let baseModel_;
        Object.defineProperty(this, 'baseModel', {
            get: function () {
                if (baseModel_) {
                    return baseModel_;
                }
                //get parent context
                let context = self.parent.context;
                /**
                 * @type {DataConfigurationStrategy}
                 */
                let strategy = context.getConfiguration().getStrategy(DataConfigurationStrategy);
                let definition = strategy.getModelDefinition(self.mapping.associationAdapter);
                if (_.isNil(definition)) {
                    let associationObjectField = self.mapping.associationObjectField || DataObjectTag.DEFAULT_OBJECT_FIELD;
                    let associationValueField = self.mapping.associationValueField || DataObjectTag.DEFAULT_VALUE_FIELD;
                    let parentModel = self.parent.getModel();
                    // get value type
                    let refersTo = context.model(self.mapping.parentModel).getAttribute(self.mapping.refersTo);
                    let refersToType = (refersTo && refersTo.type) || 'Text';
                    let objectFieldType = parentModel.getAttribute(self.mapping.parentField).type;
                    if (objectFieldType === 'Counter') {
                        objectFieldType = 'Integer'; 
                    }
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
                            { 'type': 'unique', 'fields': [associationObjectField, associationValueField] }
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
                    strategy.setModelDefinition(definition);
                }
                baseModel_ = new DataModel(definition);
                baseModel_.context = self.parent.context;
                return baseModel_;
            }, configurable: false, enumerable: false
        });

        /**
         * Gets an instance of DataModel class which represents the data adapter of this association
         * @returns {DataModel}
         */
        this.getBaseModel = function () {
            return this.baseModel;
        };

        // override DataQueryable#model
        Object.defineProperty(this, 'model', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: this.baseModel
        });
        // override DataQueryable#query
        Object.defineProperty(this, 'query', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: QueryUtils.query(this.baseModel.viewAdapter)
        });

        // add select
        this.select(this.getValueField()).asArray();
        // modify query (add join parent model)
        let left = {}, right = {};
        // get parent adapter
        let parentAdapter = self.parent.getModel().viewAdapter;
        // set left operand of native join expression
        left[parentAdapter] = [this.mapping.parentField];
        // set right operand of native join expression
        right[this.mapping.associationAdapter] = [QueryField.select(this.getObjectField()).from(this.mapping.associationAdapter).$name];
        let field1 = QueryField.select(this.getObjectField()).from(this.mapping.associationAdapter).$name;
        // apply join expression
        this.query.join(parentAdapter, []).with([left, right]).where(field1).equal(obj[this.mapping.parentField]).prepare(false);
    }
    /**
     * @returns {string}
     */
    getObjectField() {
        return DataObjectJunction.prototype.getObjectField.bind(this)();
    }
    /**
     * @returns {string}
     */
    getValueField() {
        return DataObjectJunction.prototype.getValueField.bind(this)();
    }
    /**
     * Migrates the underlying data association adapter.
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     */
    migrate(callback) {
        this.getBaseModel().migrate(callback);
    }
    /**
     * Overrides DataQueryable.count() method
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @ignore
     */
    count(callback) {
        let self = this;
        let superCount = super.count.bind(this);
        if (typeof callback === 'undefined') {
            return Q.Promise(function (resolve, reject) {
                return self.migrate(function (err) {
                    if (err) {
                        return reject(err);
                    }
                    // noinspection JSPotentiallyInvalidConstructorUsage
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
            return superCount(callback);
        });
    }
    /**
     * Overrides DataQueryable.execute() method
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @ignore
     */
    execute(callback) {
        let superExecute = super.execute.bind(this);
        this.migrate(function (err) {
            if (err) {
                return callback(err);
            }
            // noinspection JSPotentiallyInvalidConstructorUsage
            superExecute(callback);
        });
    }
    /**
     * Inserts an array of values
     * @param {*} item
     * @param {Function=} callback
     */
    insert(item, callback) {
        let self = this;
        if (typeof callback === 'undefined') {
            return Q.Promise(function (resolve, reject) {
                return insert_.bind(self)(item, function (err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            });
        }
        return insert_.call(self, item, callback);
    }
    /**
     * Removes all values
     * @param {Function=} callback
     * @returns Promise<T>|*
     * @example
     context.model('Person').where('email').equal('veronica.fletcher@example.com')
     .getTypedItem().then(function(person) {
            person.property('skills').removeAll().then(function() {
                return done();
            });
        }).catch(function(err) {
            return done(err);
        });
     *
     */
    removeAll(callback) {
        let self = this;
        if (typeof callback !== 'function') {
            return Q.Promise(function (resolve, reject) {
                return clear_.bind(self)(function (err) {
                    if (err) {
                        return reject(err); 
                    }
                    return resolve();
                });
            });
        } else {
            return clear_.call(self, callback);
        }
    }
    /**
     * Removes a value or an array of values
     * @param {Array|*} item
     * @param {Function=} callback
     * @returns Promise<T>|*
     */
    remove(item, callback) {
        let self = this;
        if (typeof callback !== 'function') {
            return Q.Promise(function (resolve, reject) {
                return remove_.bind(self)(item, function (err) {
                    if (err) {
                        return reject(err); 
                    }
                    return resolve();
                });
            });
        }
        return remove_.call(self, item, callback);
    }
}

DataObjectTag.DEFAULT_OBJECT_FIELD = 'object';
DataObjectTag.DEFAULT_VALUE_FIELD = 'value';

/**
 * @this DataObjectTag
 * @param obj
 * @param callback
 * @private
 */
function insert_(obj, callback) {
    let self = this;
    let values = [];
    if (_.isArray(obj)) {
        values = obj;
    } else {
        values.push(obj);
    }
    self.migrate(function(err) {
        if (err) {
            return callback(err);
        }
        // get object field name
        let objectField = self.getObjectField();
        // get value field name
        let valueField = self.getValueField();
        // map the given items
        let items = _.map(_.filter(values, function(x) {
            return !_.isNil(x);
        }), function (x) {
            let res = {};
            res[objectField] = self.parent[self.mapping.parentField];
            res[valueField] = x;
            return res;
        });
        // and finally save items
        return self.getBaseModel().silent(self.$silent).save(items).then(function() {
            return callback();
        }).catch(function(err) {
            return callback(err);
        });
    });
}


/**
 * @this DataObjectTag
 * @param callback
 * @private
 */
function clear_(callback) {
    let self = this;
    self.migrate(function(err) {
        if (err) {
            return callback(err);
        }
        self.getBaseModel().silent(self.$silent).where(self.getObjectField()).equal(self.parent[self.mapping.parentField]).select('id').getAllItems().then(function(result) {
            if (result.length===0) {
                return callback(); 
            }
            return self.getBaseModel().remove(result).then(function () {
                return callback();
            });
        }).catch(function(err) {
            return callback(err);
        });
    });
}


/**
 * @this DataObjectTag
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
function remove_(obj, callback) {
    let self = this;
    let values = [];
    if (_.isArray(obj)) {
        values = obj;
    } else {
        values.push(obj);
    }
    self.migrate(function(err) {
        if (err) {
            return callback(err);
        }
        // get object field name
        let objectField = self.getObjectField();
        // get value field name
        let valueField = self.getValueField();
        let items = _.map(_.filter(values, function(x) {
            return !_.isNil(x);
        }), function (x) {
            let res = {};
            res[objectField] = self.parent[self.mapping.parentField];
            res[valueField] = x;
            return res;
        });
        return self.getBaseModel().silent(self.$silent).remove(items, callback);
    });
}

module.exports = {
    DataObjectTag
};

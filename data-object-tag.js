// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const { DataConfigurationStrategy } = require('./data-configuration');
const { QueryField } = require('@themost/query');
const _ = require('lodash');
const { DataAssociationMapping } = require('./types');
const { DataQueryable } = require('./data-queryable');
const { instanceOf } = require('./instance-of');
const parentProperty = Symbol('parent');
const mappingProperty = Symbol('mapping');
const baseModelProperty = Symbol('baseModel');
/**
 * @classdesc Represents a collection of values associated with a data object e.g. a collection of tags of an article, a set of skills of a person etc.
 * @property {DataModel} baseModel - The model associated with this data object junction
 * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectTag class.
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
class DataObjectTag extends DataQueryable {
    constructor(parent, mapping) {
        super();
        // set parent
        this.parent = parent;
        if (mapping == null) {
            throw new Error('Expected an instance of data association mapping');
        }
        if (typeof mapping === 'string') {
            this.mapping = this.parent.getModel().inferMapping(mapping);
        } else if (instanceOf(mapping, DataAssociationMapping)) {
            this.mapping = mapping;
        } else {
            this.mapping = Object.assign(new DataAssociationMapping(), mapping);
        }
        // set model
        this.model = this.baseModel;
        // set silent mode
        const silentMode = this.parent.getModel().isSilent();
        // set silent model
        this.model.silent(silentMode);
        // add select
        this.select(this.getValueField()).asArray();
        // modify query (add join parent model)
        let left = {}; let right = {};
        // get parent adapter
        let parentAdapter = this.parent.getModel().viewAdapter;
        // set left operand of native join expression
        left[parentAdapter] = [this.mapping.parentField];
        // set right operand of native join expression
        right[this.mapping.associationAdapter] = [QueryField.select(this.getObjectField()).from(this.mapping.associationAdapter).$name];
        let field1 = QueryField.select(this.getObjectField()).from(this.mapping.associationAdapter).$name;
        // apply join expression
        this.query.join(parentAdapter, []).with([left, right]).where(field1).equal(parent[this.mapping.parentField]).prepare(false);
    }

    get baseModel() {
        if (this[baseModelProperty]) {
            return this[baseModelProperty];
        }
        //get parent context
        const context = this.parent.context;
        /**
         * @type {DataConfigurationStrategy}
         */
        let strategy = context.getConfiguration().getStrategy(DataConfigurationStrategy);
        let definition = strategy.getModelDefinition(this.mapping.associationAdapter);
        if (_.isNil(definition)) {
            let associationObjectField = this.mapping.associationObjectField || DataObjectTag.DEFAULT_OBJECT_FIELD;
            let associationValueField = this.mapping.associationValueField || DataObjectTag.DEFAULT_VALUE_FIELD;
            let parentModel = this.parent.getModel();
            // get value type
            let refersTo = context.model(this.mapping.parentModel).getAttribute(this.mapping.refersTo);
            let refersToType = (refersTo && refersTo.type) || 'Text';
            let objectFieldType = parentModel.getAttribute(this.mapping.parentField).type;
            if (objectFieldType === 'Counter') {
                objectFieldType = 'Integer';
            }
            definition = {
                "name": this.mapping.associationAdapter,
                "hidden": true,
                "source": this.mapping.associationAdapter,
                "view": this.mapping.associationAdapter,
                "version": "1.0",
                "fields": [
                    {
                        "name": "id",
                        "type": "Counter",
                        "nullable": false,
                        "primary": true
                    },
                    {
                        "name": associationObjectField,
                        "type": objectFieldType,
                        "nullable": false,
                        "many": false,
                        "indexed": true
                    },
                    {
                        "name": associationValueField,
                        "type": refersToType,
                        "nullable": false,
                        "many": false,
                        "indexed": true
                    }
                ],
                "constraints": [
                    { "type": "unique", "fields": [associationObjectField, associationValueField] }
                ],
                "privileges": this.mapping.privileges || [
                    {
                        "mask": 15,
                        "type": "global"
                    },
                    {
                        "mask": 15,
                        "type": "global",
                        "account": "Administrators"
                    }
                ]
            };
            strategy.setModelDefinition(definition);
        }
        const DataModel = require('./data-model').DataModel;
        this[baseModelProperty] = new DataModel(definition);
        this[baseModelProperty].context = this.parent.context;
        return this[baseModelProperty];
    }

    getBaseModel() {
        return this.baseModel;
    }

    get mapping() {
        return this[mappingProperty];
    }

    set mapping(value) {
        this[mappingProperty] = value;
    }

    get parent() {
        return this[parentProperty];
    }

    set parent(value) {
        this[parentProperty] = value;
    }

    /**
     * @returns {string=}
     */
    getObjectField() {
        // get base model
        const baseModel = this.getBaseModel();
        // if association parent field is defined use this
        if (this.mapping && this.mapping.associationObjectField) {
            return this.mapping.associationObjectField;
        }
        // if base model has the traditional parent attribute
        let attr = baseModel.attributes.find(function(x) {
            return x.name === DataObjectTag.DEFAULT_OBJECT_FIELD;
        });
        if (attr) {
            return attr.name;
        }
        // else try to find parent model definition
        const parentType = this.mapping.parentModel;
        attr = baseModel.attributes.find(function(x) {
            return x.type === parentType;
        });
        if (attr) {
            return attr.name;
        }
        return DataObjectTag.DEFAULT_OBJECT_FIELD;
    }
    /**
     * @returns {string=}
     */
    getValueField() {
        // get base model
        const baseModel = this.getBaseModel();
        // if association child field is defined use this
        if (this.mapping && this.mapping.associationValueField) {
            return this.mapping.associationValueField;
        }
        // if base model has the traditional parent attribute
        let attr = baseModel.attributes.find(function(x) {
            return x.name === DataObjectTag.DEFAULT_VALUE_FIELD;
        });
        if (attr) {
            return attr.name;
        }
        // else try to find parent model definition
        const childType = this.mapping.childModel;
        attr = baseModel.attributes.find(function(x) {
            return x.type === childType;
        });
        if (attr) {
            return attr.name;
        }
        return DataObjectTag.DEFAULT_VALUE_FIELD;
    }
    /**
     * Migrates the underlying data association adapter.
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     */
    migrate(callback) {
        this.getBaseModel().migrate(callback);
    }

    migrateAsync() {
        return this.baseModel.migrateAsync();
    }
    /**
     * Overrides DataQueryable.count() method
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @ignore
     */
    count(callback) {
        let self = this;
        const superCount = super.count.bind(this);
        if (typeof callback === 'undefined') {
            return new Promise(function (resolve, reject) {
                return self.migrate(function (err) {
                    if (err) {
                        return reject(err);
                    }
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
            return superCount(callback);
        });
    }
    /**
     * Overrides DataQueryable.execute() method
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @ignore
     */
    execute(callback) {
        let self = this;
        const superExecute = super.execute;
        self.migrate(function (err) {
            if (err) {
                return callback(err);
            }
            return superExecute.bind(self)(callback);
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
            return new Promise(function (resolve, reject) {
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
     *
     */
    removeAll(callback) {
        let self = this;
        if (typeof callback !== 'function') {
            return new Promise(function (resolve, reject) {
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
            return new Promise(function (resolve, reject) {
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

DataObjectTag.DEFAULT_OBJECT_FIELD = "object";
DataObjectTag.DEFAULT_VALUE_FIELD = "value";

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
    self.migrate(function (err) {
        if (err)
            return callback(err);
        // get object field name
        let objectField = self.getObjectField();
        // get value field name
        let valueField = self.getValueField();
        // map the given items
        let items = _.map(_.filter(values, function (x) {
            return !_.isNil(x);
        }), function (x) {
            let res = {};
            res[objectField] = self.parent[self.mapping.parentField];
            res[valueField] = x;
            return res;
        });
        // and finally save items
        return self.getBaseModel().silent(self.$silent).save(items).then(function () {
            return callback();
        }).catch(function (err) {
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
    self.migrate(function (err) {
        if (err) {
            return callback(err);
        }
        self.getBaseModel().silent(self.$silent).where(self.getObjectField()).equal(self.parent[self.mapping.parentField]).select("id").getAllItems().then(function (result) {
            if (result.length === 0) {
                return callback();
            }
            return self.getBaseModel().remove(result).then(function () {
                return callback();
            });
        }).catch(function (err) {
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
    if (_.isArray(obj))
        values = obj;
    else {
        values.push(obj);
    }
    self.migrate(function (err) {
        if (err) {
            return callback(err);
        }
        // get object field name
        let objectField = self.getObjectField();
        // get value field name
        let valueField = self.getValueField();
        let items = _.map(_.filter(values, function (x) {
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
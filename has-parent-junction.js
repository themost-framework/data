// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const _ = require('lodash');
const Q = require('q');
const async = require('async');
const {QueryField} = require('@themost/query');
const {DataAssociationMapping} = require('./types');
const {DataConfigurationStrategy} = require('./data-configuration');
const {DataQueryable} = require('./data-queryable');
const {DataObjectJunction} = require('./data-object-junction');
const { instanceOf } = require('./instance-of');
const {hasOwnProperty} = require('./has-own-property');
const parentProperty = Symbol('parent');
const mappingProperty = Symbol('mapping');
const baseModelProperty = Symbol('baseModel');
/**
 * @property {DataModel} baseModel - The model associated with this data object junction
 * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectJunction class.
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
class HasParentJunction extends DataQueryable {
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
        this.model = this.parent.context.model(this.mapping.parentModel);
        // set silent mode
        const silentMode = this.parent.getModel().isSilent();
        // set silent model
        this.model.silent(silentMode);
        //modify query (add join model)
        let adapter = this.model.viewAdapter;
        let left = {}, right = {};
        this.select();
        // get association adapter
        let associationAdapter = this.mapping.associationAdapter;
        // get parent field
        let parentField = QueryField.select(this.getObjectField()).from(associationAdapter).$name;
        // get child field
        let childField = QueryField.select(this.getValueField()).from(associationAdapter).$name;
        // set left operand of join expression
        left[adapter] = [this.mapping.parentField];
        // set right operand of join expression
        right[associationAdapter] = [parentField];
        // apply native join expression to query
        this.query.join(this.mapping.associationAdapter, []).with([left, right]).where(childField).equal(parent[this.mapping.childField]).prepare();
    }

    get baseModel() {
        const DataModel = require('./data-model').DataModel;
        if (this[baseModelProperty]) {
            return this[baseModelProperty];
        }
        /**
         * @type {*|DataConfigurationStrategy}
         */
        let configuration = this.parent.context.getConfiguration().getStrategy(DataConfigurationStrategy);
        //search in cache (configuration.current.cache)
        if (configuration.getModelDefinition(this.mapping.associationAdapter)) {
            this[baseModelProperty] = new DataModel(configuration.getModelDefinition(this.mapping.associationAdapter));
            this[baseModelProperty].context = this.parent.context;
            return this[baseModelProperty];
        }
        //otherwise create model
        let parentModel = this.parent.getModel();
        // eslint-disable-next-line no-unused-vars
        let parentField = parentModel.field(this.mapping.parentField);
        let childModel = this.parent.context.model(this.mapping.childModel);
        // eslint-disable-next-line no-unused-vars
        let childField = childModel.field(this.mapping.childField);
        let adapter = this.mapping.associationAdapter;
        this[baseModelProperty] = this.parent.context.model(adapter);
        if (this[baseModelProperty] == null) {
            let associationObjectField = this.mapping.associationObjectField || DataObjectJunction.DEFAULT_OBJECT_FIELD;
            let associationValueField = this.mapping.associationValueField || DataObjectJunction.DEFAULT_VALUE_FIELD;
            let modelDefinition = {
                "name": adapter,
                "title": adapter,
                "sealed": false,
                "hidden": true,
                "type": "hidden",
                "source": adapter,
                "view": adapter,
                "version": "1.0",
                "fields": [
                    {
                        "name": "id",
                        "type": "Counter",
                        "primary": true
                    },
                    { 
                        "name": associationObjectField,
                        "indexed": true,
                        "nullable": false,
                        "type": this.mapping.parentModel
                    },
                    {
                        "name": associationValueField,
                        "indexed": true,
                        "nullable": false,
                        "type": this.mapping.childModel
                    }
                ],
                "constraints": [
                    {
                        "description": "The relation between two objects must be unique.",
                        "type": "unique",
                        "fields": [
                            associationObjectField,
                            associationValueField
                        ]
                    }
                ], "privileges": this.mapping.privileges || [
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
            // add unique constraint if child model mappind is Zero Or One
            let attribute = parentModel.attributes.filter(function (x) {
                return x.type === childModel.name;
            }).filter(function (y) {
                let mapping = parentModel.inferMapping(y.name);
                return mapping && mapping.associationAdapter === adapter;
            });
            if (attribute) {
                if (attribute && (attribute.multiplicity === "ZeroOrOne" || attribute.multiplicity === "One")) {
                    modelDefinition.constraints[0].fields = [associationObjectField];
                }
            }
            configuration.setModelDefinition(modelDefinition);
            //initialize base model
            this[baseModelProperty] = new DataModel(modelDefinition);
            this[baseModelProperty].context = this.parent.context;
        }
        return this[baseModelProperty];
    }

    getBaseModel() {
        return this.baseModel;
    }

    /**
     * @returns {DataAssociationMapping}
     */
    get mapping() {
        return this[mappingProperty];
    }

    /**
     * @param {DataAssociationMapping} value
     */
    set mapping(value) {
        this[mappingProperty] = value;
    }

    /**
     * @returns {DataObject}
     */
    get parent() {
        return this[parentProperty];
    }

    /**
     * @param {DataObject} value
     */
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
            return x.name === DataObjectJunction.DEFAULT_OBJECT_FIELD;
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
        return DataObjectJunction.DEFAULT_OBJECT_FIELD;
    }
    /**
     * @returns {string=}
     */
    getValueField() {
        // get base model
        let baseModel = this.getBaseModel();
        // if association child field is defined use this
        if (this.mapping && this.mapping.associationValueField) {
            return this.mapping.associationValueField;
        }
        // if base model has the traditional parent attribute
        let attr = _.find(baseModel.attributes, function(x) {
            return x.name === DataObjectJunction.DEFAULT_VALUE_FIELD;
        });
        if (attr) {
            return attr.name;
        }
        // else try to find parent model definition
        const childType = this.mapping.childModel;
        attr = _.find(baseModel.attributes, function(x) {
            return x.type === childType;
        });
        if (attr) {
            return attr.name;
        }
        return DataObjectJunction.DEFAULT_VALUE_FIELD;
    }
    /**
     * Inserts an association between parent object and the given object or array of objects.
     * @param {*|Array} obj - An object or an array of objects to be related with parent object
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
     */
    insert(obj, callback) {
        let self = this;
        if (typeof callback === 'undefined') {
            return Q.Promise(function (resolve, reject) {
                return insert_.bind(self)(obj, function (err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            });
        }
        return insert_.bind(self)(obj, function (err) {
            return callback(err);
        });
    }
    /**
     * Removes the association between parent object and the given object or array of objects.
     * @param {*|Array} obj - An object or an array of objects to be disconnected from parent object
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
     */
    remove(obj, callback) {
        let self = this;
        if (typeof callback === 'undefined') {
            return Q.Promise(function (resolve, reject) {
                return remove_.bind(self)(obj, function (err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            });
        }
        return remove_.bind(self)(obj, function (err) {
            return callback(err);
        });
    }
    migrate(callback) {
        this.baseModel.migrate(callback);
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
        if (typeof callback === 'undefined') {
            return Q.Promise(function (resolve, reject) {
                return self.migrate(function (err) {
                    if (err) {
                        return reject(err);
                    }
                    // noinspection JSPotentiallyInvalidConstructorUsage
                    let superCount = HasParentJunction.super_.prototype.count.bind(self);
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
            let superCount = HasParentJunction.super_.prototype.count.bind(self);
            return superCount(callback);
        });
    }
}

/**
 * @this HasParentJunction
 * Inserts a new association between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
function insertSingleObject_(obj, callback) {
    let self = this;
    //get parent and child
    let parent = obj;
    if (typeof obj !== 'object') {
        parent = {};
        parent[self.mapping.parentField] = obj;
    }
    let parentValue = parent[self.mapping.parentField];
    let childValue = self.parent[self.mapping.childField];
    //validate relation existence
    self.baseModel.silent(self.$silent).where(self.getObjectField()).equal(parentValue).and(self.getValueField()).equal(childValue).first(function(err, result) {
        if (err) {
            //on error exit with error
            return callback(err);
        } else {
            if (result) {
                //if relation already exists, do nothing
                return callback();
            } else {
                //otherwise create new item
                let newItem = { };
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
function insert_(obj, callback) {
    let self = this;
    let arr = [];
    if (_.isArray(obj))
        arr = obj;
    else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err)
            callback(err);
        else {
            async.eachSeries(arr, function(item, cb) {
                let parent = item;
                if (typeof item !== 'object') {
                    parent = {};
                    parent[self.mapping.parentField] = item;
                }
                //validate if child identifier exists
                if (hasOwnProperty(parent, self.mapping.parentField)) {
                    insertSingleObject_.call(self, parent, function(err) {
                        cb(err);
                    });
                } else {
                    //get related model
                    let relatedModel = self.parent.context.model(self.mapping.parentModel);
                    //ensure silent mode
                    if (self.getBaseModel().$silent) {
                        relatedModel.silent(); 
                    }
                    //find object by querying child object
                    relatedModel.find(item).select(self.mapping.parentField).first(function (err, result) {
                        if (err) {
                            cb(null);
                        } else {
                            if (!result) {
                                //child was not found (do nothing or throw exception)
                                cb(null);
                            } else {
                                parent[self.mapping.parentField] = result[self.mapping.parentField];
                                insertSingleObject_.call(self, parent, function(err) {
                                    cb(err);
                                });
                            }
                        }
                    });
                }

            }, callback);
        }
    });
}

/**
 * @this HasParentJunction
 * Removes a relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
function removeSingleObject_(obj, callback) {
    let self = this;
    //get parent and child
    let parent = obj;
    if (typeof obj !== 'object') {
        parent = {};
        parent[self.mapping.parentField] = obj;
    }
    let parentValue = parent[self.mapping.parentField];
    let childValue = self.parent[self.mapping.childField];
    //get relation model
    self.baseModel.silent(self.$silent).where(this.getObjectField()).equal(parentValue).and(this.getValueField()).equal(childValue).first(function(err, result) {
        if (err) {
            callback(err);
        } else {
            if (!result) {
                callback(null);
            } else {
                //otherwise remove item
                self.baseModel.silent(self.$silent).remove(result, callback);
            }
        }
    });
}

/**
 * @this HasParentJunction
 * @param obj
 * @param callback
 * @private
 */
function remove_(obj, callback) {
    let self = this, arr = [];
    if (_.isArray(obj))
        arr = obj;
    else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err)
            callback(err);
        else {
            async.eachSeries(arr, function(item, cb) {
                let parent = item;
                if (typeof item !== 'object') {
                    parent = {};
                    parent[self.mapping.parentField] = item;
                }
                //get related model
                let relatedModel = self.parent.context.model(self.mapping.parentModel);
                //find object by querying child object
                relatedModel.find(parent).select(self.mapping.parentField).first(function (err, result) {
                    if (err) {
                        return cb();
                    } else {
                        if (!result) {
                            //child was not found (do nothing or throw exception)
                            cb();
                        } else {
                            parent[self.mapping.parentField] = result[self.mapping.parentField];
                            removeSingleObject_.call(self, parent, function(err) {
                                cb(err);
                            });
                        }
                    }
                });
            }, callback);
        }
    });
}
module.exports = {
    HasParentJunction
};

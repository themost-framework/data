// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const {DataError} = require('@themost/common');
const _ = require('lodash');
const Q = require('q');
const async = require('async');
const {QueryField} = require('@themost/query');
const {DataAssociationMapping} = require('./types');
const {DataQueryable} = require('./data-queryable');
const {DataConfigurationStrategy} = require('./data-configuration');
const {hasOwnProperty} = require('./has-own-property');
const parentProperty = Symbol();
const baseModelProperty = Symbol('baseModel');
const mappingProperty = Symbol('mapping');

class DataObjectJunction extends DataQueryable {
    /**
     * @classdesc Represents a many-to-many association between two data models.
     * @property {DataModel} baseModel - The model associated with this data object junction
     * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectJunction class.
     * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
     */
    constructor(parent, mapping) {
        super();
        // set parent object
        this.parent = parent;
        // infer data association mapping
        if (typeof mapping === 'string') {
            // find association by name
            if (this.parent != null) {
                // get parent model
                const model = this.parent.getModel();
                if (model == null) {
                    throw new DataError('ERR_UKNOWN_MODEL', 'The model of the parent object cannot be found or is inaccessible.');
                }
                // and infer mapping
                this.mapping = model.inferMapping(mapping);
            }
        } else if (mapping !=null) {
            if (mapping instanceof DataAssociationMapping)
                this.mapping = mapping;
            else
                this.mapping = Object.assign(new DataAssociationMapping(), mapping);
        }
        // set model
        this.model = this.parent.context.model(this.mapping.childModel);
        if (this.model == null) {
            throw new DataError('ERR_UKNOWN_MODEL', 'The specified model cannot be found or is inaccessible.', null, this.mapping.childModel);
        }
        // modify query (add join model)
        const adapter = this.model.viewAdapter;
        const left = {}
        const right = {};
        // select attributes
        this.select();
        // set join expression
        left[adapter] = [ this.model.primaryKey ];
        let baseAdapter = this.getBaseModel().viewAdapter;
        right[baseAdapter] = [QueryField.select(this.getValueField()).from(baseAdapter).$name];
        let field1 = QueryField.select(this.getObjectField()).from(baseAdapter).$name;
        this.query.join(baseAdapter, []).with([left, right]).where(field1).equal(parent[this.mapping.parentField]).prepare();
    }

    get baseModel() {
        if (this[baseModelProperty] != null) {
            return this[baseModelProperty];
        }
        const DataModel = require('./data-model').DataModel;
        //get parent context
        const context = this.parent.context;
        /**
         * @type {*|DataConfigurationStrategy}
         */
        const configuration = context.getConfiguration().getStrategy(DataConfigurationStrategy);
        //search in cache (configuration.current.cache)
        let modelDefinition = configuration.getModelDefinition(this.mapping.associationAdapter);
        if (modelDefinition) {
            this[baseModelProperty] = new DataModel(modelDefinition);
            this[baseModelProperty].context = this.parent.context;
            return this[baseModelProperty];
        }
        //get parent and child field in order to get junction field types
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
            modelDefinition = {
                name: adapter, title: adapter, source: adapter, type: "hidden", hidden: true, sealed: false, view: adapter, version: '1.0', fields: [
                    { name: "id", type: "Counter", primary: true },
                    { name: associationObjectField, indexed: true, nullable: false, type: this.mapping.parentModel },
                    { name: associationValueField, indexed: true, nullable: false, type: this.mapping.childModel }],
                "constraints": [
                    {
                        "description": "The relation between two objects must be unique.",
                        "type": "unique",
                        "fields": [associationObjectField, associationValueField]
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
            if (this.mapping.refersTo) {
                let refersTo = parentModel.getAttribute(this.mapping.refersTo);
                if (refersTo && (refersTo.multiplicity === "ZeroOrOne" || refersTo.multiplicity === "One")) {
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
         * Gets an instance of DataModel class which represents the data adapter of this association
         * @returns {DataModel}
         */
    getBaseModel() {
        return this.baseModel;
    }

    /**
     * @returns {string}
     */
    getObjectField() {
        let self = this;
        // get base model
        let baseModel = this.getBaseModel();
        // if association parent field is defined use this
        if (self.mapping && self.mapping.associationObjectField) {
            return self.mapping.associationObjectField;
        }
        // if base model has the traditional parent attribute
        let attr = _.find(baseModel.attributes, function(x) {
            return x.name === DataObjectJunction.DEFAULT_OBJECT_FIELD;
        });
        if (attr) {
            return attr.name;
        }
        // else try to find parent model definition
        attr = _.find(baseModel.attributes, function(x) {
            return self.mapping && (x.type === self.mapping.parentModel);
        });
        if (attr) {
            return attr.name;
        }
        return DataObjectJunction.DEFAULT_OBJECT_FIELD;
    }

    /**
     * @returns {string}
     */
    getValueField() {
        let self = this;
        // get base model
        let baseModel = this.getBaseModel();
        // if association child field is defined use this
        if (self.mapping && self.mapping.associationValueField) {
            return self.mapping.associationValueField;
        }
        // if base model has the traditional parent attribute
        let attr = _.find(baseModel.attributes, function(x) {
            return x.name === DataObjectJunction.DEFAULT_VALUE_FIELD;
        });
        if (attr) {
            return attr.name;
        }
        // else try to find parent model definition
        attr = _.find(baseModel.attributes, function(x) {
            return self.mapping && (x.type === self.mapping.childModel);
        });
        if (attr) {
            return attr.name;
        }
        return DataObjectJunction.DEFAULT_VALUE_FIELD;
    }

    /**
     * Migrates the underlying data association adapter.
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     */
    migrate(callback) {
        let self = this;
        let model = this.getBaseModel();
        model.migrate(function(err) {
            if (err) {
                return callback(err);
            }
            //migrate related model
            let childModel = self.parent.context.model(self.mapping.childModel);
            return childModel.migrate(callback);
        });
    }

    migrateAsync() {
        return this.baseModel.migrateAsync();
    }

    /**
     * Overrides DataQueryable.execute() method
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @ignore
     */
    execute(callback) {
        const self = this;
        const superExecute = super.execute;
        self.migrate(function(err) {
            if (err) {
                callback(err); return; 
            }
            // noinspection JSPotentiallyInvalidConstructorUsage
            superExecute(callback)
        });
    }

    /**
     * Overrides DataQueryable.count() method
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @ignore
     */
    count(callback) {
        let self = this;
        if (typeof callback === 'undefined') {
            return Q.Promise(function(resolve, reject) {
                return self.migrate(function(err) {
                    if (err) {
                        return reject(err);
                    }
                    // noinspection JSPotentiallyInvalidConstructorUsage
                    let superCount = DataObjectJunction.super_.prototype.count.bind(self);
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
            let superCount = DataObjectJunction.super_.prototype.count.bind(self);
            return superCount(callback);
        });
    }

    /**
     * Inserts an association between parent object and the given object or array of objects.
     * @param {*} obj - An object or an array of objects to be related with parent object
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
     * @example
     //add a user (by name) in Administrators group
     var groups = context.model('Group');
     groups.where('name').equal('Administrators')
     .first().then(function(result) {
            var group = groups.convert(result);
            group.property('members').insert({ name: 'alexis.rees@example.com' }).then(function() {
                done();
            });
        }).catch(function(err) {
            done(err);
        });
     */
    insert(obj, callback) {
        let self = this;
        if (typeof callback === 'undefined') {
            return Q.Promise(function(resolve, reject) {
                return insert_.call(self, obj, function(err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(obj);
                });
            });
        }
        return insert_.call(self, obj, function (err) {
            if (err) {
                return callback(err);
            }
            return callback(null, obj);
        });
    }

    /**
     * @param callback
     * @returns {Promise<T>|*}
     */
    removeAll(callback) {
        let self = this;
        if (typeof callback === 'undefined') {
            return new Promise(function(resolve, reject) {
                return clear_.call(self, function(err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            });
        }
        return clear_.call(self, callback);
    }

    /**
     * Removes the association between parent object and the given object or array of objects.
     * @param {*} obj - An object or an array of objects to be disconnected from parent object
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
     */
    remove(obj, callback) {
        let self = this;
        if (typeof callback === 'undefined') {
            return new Promise(function(resolve, reject) {
                return remove_.call(self, obj, function(err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            });
        }
        return remove_.call(self, obj, callback);
    }

}

DataObjectJunction.DEFAULT_OBJECT_FIELD = 'parentId';
DataObjectJunction.DEFAULT_VALUE_FIELD = 'valueId';

/**
 * @this DataObjectJunction
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
function insert_(obj, callback) {
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
                let child = item;
                if (typeof item !== 'object') {
                    child = {};
                    child[self.mapping.childField] = item;
                }
                //validate if child identifier exists
                if (hasOwnProperty(child, self.mapping.childField)) {
                    insertSingleObject_.call(self, child, function(err) {
                        cb(err);
                    });
                } else {
                    /**
                     * Get related model. The related model is the model of any child object of this junction.
                     * @type {DataModel}
                     */
                    let relatedModel = self.parent.context.model(self.mapping.childModel);
                    // find object by querying child object
                    relatedModel.find(child).select(self.mapping.childField).first(function (err, result) {
                        if (err) {
                            cb(err);
                        } else {
                            /**
                             * Validates related object and inserts this object
                             * finally, defines the relation between child and parent objects
                             */
                            if (!result) {
                                //ensure silent mode
                                if (self.getBaseModel().$silent) {
                                    relatedModel.silent();
                                }
                                // insert related item
                                relatedModel.save(child, function(err) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        //insert relation between child and parent
                                        insertSingleObject_.call(self, child, function(err) {
                                            cb(err); 
                                        });
                                    }
                                });
                            } else {
                                //set primary key
                                child[self.mapping.childField] = result[self.mapping.childField];
                                //insert relation between child and parent
                                insertSingleObject_.call(self, child, function(err) {
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
 * @this DataObjectJunction
 * @param {Function} callback
 * @private
 */
function clear_(callback) {
    let self = this;
    // auto migrate
    self.migrate(function(err) {
        if (err) {
            return callback();
        }
        // get parent id
        let parentValue = self.parent[self.mapping.parentField];
        // get relation model
        let baseModel = self.getBaseModel();
        // validate relation existence
        baseModel.where(self.getObjectField()).equal(parentValue).all(function(err, result) {
            // if error occurred
            if (err) {
                return callback();
            }
            // if there are no items
            if (result.length===0) {
                // return
                return callback();
            }
            // otherwise, remove items
            baseModel.remove(result, callback);
        });
    });
}

/**
 * @this DataObjectJunction
 * Inserts a new relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
function insertSingleObject_(obj, callback) {
    let self = this;
    //get parent and child
    let child = obj;
    if (typeof obj !== 'object') {
        child = {};
        child[self.mapping.childField] = obj;
    }
    let parentValue = self.parent[self.mapping.parentField];
    let childValue = child[self.mapping.childField];
    //get relation model
    let baseModel = self.getBaseModel();
    //validate relation existence
    baseModel.silent(self.$silent).where(self.getObjectField()).equal(parentValue).and(self.getValueField()).equal(childValue).first(function(err, result) {
        if (err) {
            //on error exit with error
            return callback(err);
        } else {
            if (result) {
                //if relation already exists, do nothing
                return callback(null);
            } else {
                // otherwise, create new item
                let newItem = { };
                newItem[self.getObjectField()] = parentValue;
                newItem[self.getValueField()] = childValue;
                // set silent flag
                //and insert it
                baseModel.silent(self.$silent).insert(newItem, callback);
            }
        }
    });
}
/**
 * @this DataObjectJunction
 * @param obj
 * @param callback
 * @private
 */
function remove_(obj, callback) {
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
                let child = item;
                if (typeof item !== 'object') {
                    child = {};
                    child[self.mapping.childField] = item;
                }
                //get related model
                let relatedModel = self.parent.context.model(self.mapping.childModel);
                //find object by querying child object
                relatedModel.find(child).select(self.mapping.childField).first(function (err, result) {
                    if (err) {
                        cb(null);
                    } else {
                        if (!result) {
                            //child was not found (do nothing or throw exception)
                            cb(null);
                        } else {
                            child[self.mapping.childField] = result[self.mapping.childField];
                            removeSingleObject_.call(self, child, function(err) {
                                cb(err);
                            });
                        }
                    }
                });
            }, callback);
        }
    });
}

/**
 * @this DataObjectJunction
 * Removes a relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
function removeSingleObject_(obj, callback) {
    let self = this;
    //get parent and child
    let child = obj;
    if (typeof obj !== 'object') {
        child = {};
        child[self.mapping.childField] = obj;
    }
    let parentValue = self.parent[self.mapping.parentField];
    let childValue = child[self.mapping.childField];
    //get relation model
    let baseModel = self.getBaseModel();
    baseModel.silent(self.$silent).where(self.getObjectField()).equal(parentValue).and(self.getValueField()).equal(childValue).first(function(err, result) {
        if (err) {
            callback(err);
        } else {
            if (!result) {
                callback(null);
            } else {
                // otherwise, remove item
                baseModel.silent(self.$silent).remove(result, callback);
            }
        }
    });
}
module.exports = {
    DataObjectJunction
};
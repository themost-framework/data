// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const _ = require('lodash');
const Q = require('q');
const async = require('async');
const {QueryField, QueryUtils} = require('@themost/query');
const {DataAssociationMapping} = require('./types');
const {DataQueryable} = require('./data-queryable');
const {DataConfigurationStrategy} = require('./data-configuration');

/**
 * @classdesc Represents a many-to-many association between two data models.
 * @augments DataQueryable
 * @property {DataModel} baseModel - The model associated with this data object junction
 * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectJunction class.
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
class DataObjectJunction extends DataQueryable {
    /**
     * 
     * @param {DataObject} obj An object which represents the parent data object
     * @param {string|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
     */
    constructor(obj, association) {
        super();
        /**
         * @type {DataObject}
         * @private
         */
        let parent_ = obj;
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
        let model;
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
        // get related model
        let relatedModel = this.parent.context.model(self.mapping.childModel);
        // override DataQueryable.model
        Object.defineProperty(this, 'model', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: relatedModel
        });
        // override DataQueryable.query
        Object.defineProperty(this, 'query', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: QueryUtils.query(relatedModel.viewAdapter)
        });
        //modify query (add join model)
        let adapter = relatedModel.viewAdapter;
        let left = {}, right = {};
        this.query.select(relatedModel.attributes.filter(function (x) {
            return !x.many;
        }).map(function (x) {
            return QueryField.select(x.name).from(adapter);
        }));
        /**
         * @type {DataModel}
         */
        let baseModel;
        Object.defineProperty(this, 'baseModel', {
            get: function () {
                if (baseModel) {
                    return baseModel;
                }
                //get parent context
                let context = self.parent.context;
                /**
                 * @type {*|DataConfigurationStrategy}
                 */
                let conf = context.getConfiguration().getStrategy(DataConfigurationStrategy);
                //search in cache (configuration.current.cache)
                let modelDefinition = conf.getModelDefinition(self.mapping.associationAdapter);
                if (modelDefinition) {
                    baseModel = new DataModel(modelDefinition);
                    baseModel.context = self.parent.context;
                    return baseModel;
                }
                //get parent and child field in order to get junction field types
                let parentModel = self.parent.getModel();
                let adapter = self.mapping.associationAdapter;
                baseModel = self.parent.context.model(adapter);
                if (_.isNil(baseModel)) {
                    let associationObjectField = self.mapping.associationObjectField || DataObjectJunction.DEFAULT_OBJECT_FIELD;
                    let associationValueField = self.mapping.associationValueField || DataObjectJunction.DEFAULT_VALUE_FIELD;
                    modelDefinition = {
                        name: adapter, title: adapter, source: adapter, type: 'hidden', hidden: true, sealed: false, view: adapter, version: '1.0', fields: [
                            { name: 'id', type: 'Counter', primary: true },
                            { name: associationObjectField, indexed: true, nullable: false, type: self.mapping.parentModel },
                            { name: associationValueField, indexed: true, nullable: false, type: self.mapping.childModel }
                        ],
                        'constraints': [
                            {
                                'description': 'The relation between two objects must be unique.',
                                'type': 'unique',
                                'fields': [associationObjectField, associationValueField]
                            }
                        ], 'privileges': self.mapping.privileges || [
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
                        let refersTo = parentModel.getAttribute(self.mapping.refersTo);
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
        let baseAdapter = this.getBaseModel().viewAdapter;
        right[baseAdapter] = [QueryField.select(this.getValueField()).from(baseAdapter).$name];
        let field1 = QueryField.select(this.getObjectField()).from(baseAdapter).$name;
        this.query.join(baseAdapter, []).with([left, right]).where(field1).equal(obj[this.mapping.parentField]).prepare();

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
        let attr = _.find(baseModel.attributes, function (x) {
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
        let attr = _.find(baseModel.attributes, function (x) {
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
    }
    /**
     * Migrates the underlying data association adapter.
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     */
    migrate(callback) {
        let self = this;
        let model = this.getBaseModel();
        model.migrate(function (err) {
            if (err) {
                return callback(err);
            }
            //migrate related model
            let childModel = self.parent.context.model(self.mapping.childModel);
            return childModel.migrate(callback);
        });
    }
    /**
     * Overrides DataQueryable.execute() method
     * @param callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @ignore
     */
    execute(callback) {
        let self = this;
        let superExecute = super.execute.bind(this);
        self.migrate(function (err) {
            if (err) {
                callback(err); return; 
            }
            // noinspection JSPotentiallyInvalidConstructorUsage
            superExecute(callback);
        });
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
            return Q.Promise(function (resolve, reject) {
                return insert_.call(self, obj, function (err) {
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
    }
    /**
     * Removes the association between parent object and the given object or array of objects.
     * @param {*} obj - An object or an array of objects to be disconnected from parent object
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
     * @example
     //remove a user (by name) from Administrators group
     var groups = context.model('Group');
     groups.where('name').equal('Administrators')
     .first().then(function(result) {
            var group = groups.convert(result);
            group.property('members').remove({ name: 'alexis.rees@example.com' }).then(function() {
                done();
            });
        }).catch(function(err) {
            done(err);
        });
     */
    remove(obj, callback) {
        let self = this;
        if (typeof callback === 'undefined') {
            return Q.Promise(function (resolve, reject) {
                return remove_.call(self, obj, function (err) {
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
    if (_.isArray(obj)) {
        arr = obj;
    } else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err) {
            callback(err);
        } else {
            async.eachSeries(arr, function(item, cb) {
                let child = item;
                if (typeof item !== 'object') {
                    child = {};
                    child[self.mapping.childField] = item;
                }
                //validate if child identifier exists
                if (Object.preventExtensions.hasOwnProperty.call(child, self.mapping.childField)) {
                    insertSingleObject_.call(self, child, function(err) {
                        cb(err);
                    });
                } else {
                    /**
                     * Get related model. The related model is the model of any child object of this junction.
                     * @type {DataModel}
                     */
                    let relatedModel = self.parent.context.model(self.mapping.childModel);
                    //find object by querying child object
                    relatedModel.find(child).select(self.mapping.childField).first(function (err, result) {
                        if (err) {
                            cb(err);
                        } else {
                            /**
                             * Validates related object, inserts this object if does not exists
                             * and finally defines the relation between child and parent objects
                             */
                            if (!result) {
                                //ensure silent mode
                                if (self.getBaseModel().$silent) {
                                    relatedModel.silent(); 
                                }
                                //insert related item if does not exists
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
            // otherwise remove items
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
                //otherwise create new item
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
 * Migrates current junction data storage
 * @param {Function} callback
 */
DataObjectJunction.prototype.migrate = function(callback) {
    let self = this;
    //get migration model
    let migrationModel = self.parent.context.model('Migration');
    //get related model
    let relationModel = self.getBaseModel();
    migrationModel.find({ appliesTo:relationModel.source, version: relationModel.version }).first(function(err, result) {
        if (err) {
            callback(err);
        } else {
            if (!result) {
                //migrate junction table
                relationModel.migrate(function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null);
                    }
                })
            } else {
                callback(null);
            }
        }
    });
};

/**
 * @this DataObjectJunction
 * @param obj
 * @param callback
 * @private
 */
function remove_(obj, callback) {
    let self = this;
    let arr = [];
    if (_.isArray(obj)) {
        arr = obj;
    } else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err) {
            callback(err);
        } else {
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
                //otherwise remove item
                baseModel.silent(self.$silent).remove(result, callback);
            }
        }
    });
}

module.exports = {DataObjectJunction};

// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const _ = require('lodash');
const Q = require('q');
const async = require('async');
const {QueryField, QueryUtils} = require('@themost/query');
const {DataAssociationMapping} = require('./types');
const {DataConfigurationStrategy} = require('./data-configuration');
const {DataQueryable} = require('./data-queryable');
const {DataObjectJunction} = require('./data-object-junction');
const {hasOwnProperty} = require('./has-own-property');

/**
 * @classdesc Represents a many-to-many association between two data models.
 * @augments DataQueryable
 * @property {DataModel} baseModel - The model associated with this data object junction
 * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectJunction class.
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
class HasParentJunction extends DataQueryable {
    /**
     *
     * @param {DataObject} obj The parent data object reference
     * @param {string|*} association - A string that represents the name of the field which holds association mapping or the association mapping itself.
     */
    constructor(obj, association) {
        super();
        let self = this;
        /**
         * @type {DataObject}
         * @private
         */
        let parent_ = obj;
        /**
         * @type {DataModel}
         */
        let model_;
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

        //get association mapping
        if (typeof association === 'string') {
            if (parent_) {
                model_ = parent_.getModel();
                if (model_ !== null) {
                    self.mapping = model_.inferMapping(association);
                }
            }
        } else if (typeof association === 'object' && association !== null) {
            //get the specified mapping
            if (association instanceof DataAssociationMapping) {
                self.mapping = association;
            } else {
                self.mapping = _.assign(new DataAssociationMapping(), association);
            }
        }

        let relatedModel = this.parent.context.model(self.mapping.parentModel);
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

        let baseModel;
        Object.defineProperty(this, 'baseModel', {
            get: function () {
                if (baseModel) {
                    return baseModel;
                }
                /**
                 * @type {*|DataConfigurationStrategy}
                 */
                let conf = self.parent.context.getConfiguration().getStrategy(DataConfigurationStrategy);
                //search in cache (configuration.current.cache)
                if (conf.getModelDefinition(self.mapping.associationAdapter)) {
                    baseModel = new DataModel(conf.getModelDefinition(self.mapping.associationAdapter));
                    baseModel.context = self.parent.context;
                    return baseModel;
                }
                //otherwise create model
                let parentModel = self.parent.getModel();
                let childModel = self.parent.context.model(self.mapping.childModel);
                let adapter = self.mapping.associationAdapter;
                baseModel = self.parent.context.model(adapter);
                if (_.isNil(baseModel)) {
                    let associationObjectField = self.mapping.associationObjectField || DataObjectJunction.DEFAULT_OBJECT_FIELD;
                    let associationValueField = self.mapping.associationValueField || DataObjectJunction.DEFAULT_VALUE_FIELD;
                    let modelDefinition = {
                        name: adapter,
                        title: adapter,
                        sealed: false,
                        hidden: true,
                        type: 'hidden',
                        source: adapter,
                        view: adapter,
                        version: '1.0',
                        fields: [
                            {name: 'id', type: 'Counter', primary: true},
                            {
                                name: associationObjectField,
                                indexed: true,
                                nullable: false,
                                type: self.mapping.parentModel
                            },
                            {name: associationValueField, indexed: true, nullable: false, type: self.mapping.childModel}
                        ],
                        constraints: [
                            {
                                description: 'The relation between two objects must be unique.',
                                type: 'unique',
                                fields: [associationObjectField, associationValueField]
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
                    // add unique constraint if child model mapping is Zero Or One
                    let attribute = parentModel.attributes.filter(function (x) {
                        return x.type === childModel.name;
                    }).filter(function (y) {
                        let mapping = parentModel.inferMapping(y.name);
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
            }, configurable: false, enumerable: false
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
        this.getBaseModel = function () {
            return this.baseModel;
        };
        // get association adapter
        let associationAdapter = self.mapping.associationAdapter;
        // get parent field
        let parentField = QueryField.select(this.getObjectField()).from(associationAdapter).$name;
        // get child field
        let childField = QueryField.select(this.getValueField()).from(associationAdapter).$name;
        // set left operand of join expression
        left[adapter] = [this.mapping.parentField];
        // set right operand of join expression
        right[associationAdapter] = [parentField];
        // apply native join expression to query
        this.query.join(this.mapping.associationAdapter, []).with([left, right]).where(childField).equal(obj[this.mapping.childField]).prepare();

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
    self.baseModel.silent(self.$silent).where(self.getObjectField()).equal(parentValue).and(self.getValueField()).equal(childValue).first(function (err, result) {
        if (err) {
            //on error exit with error
            return callback(err);
        } else {
            if (result) {
                //if relation already exists, do nothing
                return callback();
            } else {
                //otherwise create new item
                let newItem = {};
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
    if (_.isArray(obj)) {
        arr = obj;
    } else {
        arr.push(obj);
    }
    self.migrate(function (err) {
        if (err) {
            callback(err);
        } else {
            async.eachSeries(arr, function (item, cb) {
                let parent = item;
                if (typeof item !== 'object') {
                    parent = {};
                    parent[self.mapping.parentField] = item;
                }
                //validate if child identifier exists
                if (hasOwnProperty(parent, self.mapping.parentField)) {
                    insertSingleObject_.call(self, parent, function (err) {
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
                                insertSingleObject_.call(self, parent, function (err) {
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
    self.baseModel.silent(self.$silent).where(this.getObjectField()).equal(parentValue).and(this.getValueField()).equal(childValue).first(function (err, result) {
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
    if (_.isArray(obj)) {
        arr = obj;
    } else {
        arr.push(obj);
    }
    self.migrate(function (err) {
        if (err) {
            callback(err);
        } else {
            async.eachSeries(arr, function (item, cb) {
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
                            removeSingleObject_.call(self, parent, function (err) {
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

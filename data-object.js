// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const _ = require('lodash');
const {DataObjectJunction} = require('./data-object-junction');
const {DataObjectTag} = require('./data-object-tag');
const {HasManyAssociation} = require('./has-many-association');
const {HasOneAssociation} = require('./has-one-association');
const {HasParentJunction} = require('./has-parent-junction');
const {SequentialEventEmitter, DataError} = require('@themost/common');
const { hasOwnProperty } = require('./has-own-property');

const selectorsProperty = Symbol('selectors');
const typeProperty = Symbol('type');
const modelProperty = Symbol('model');
const contextProperty = Symbol('context');

const STR_MISSING_CALLBACK_ARGUMENT = 'Missing argument. Callback function expected.';


/**
 * @this DataObject
 * @param {DataContext} context - The underlying data context
 * @param {Function} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
 * @private
 */
function save_(context, callback) {
    let self = this;
    //get current application
    let model = self.getModel();
    if (_.isNil(model)) {
        return callback.call(self, new DataError('E_MODEL', 'Data model cannot be found.'));
    }
    let i;
    //register before listeners
    let beforeListeners = self.listeners('before.save');
    for (i = 0; i < beforeListeners.length; i++) {
        let beforeListener = beforeListeners[i];
        model.on('before.save', beforeListener);
    }
    //register after listeners
    let afterListeners = self.listeners('after.save');
    for (i = 0; i < afterListeners.length; i++) {
        let afterListener = afterListeners[i];
        model.on('after.save', afterListener);
    }
    model.save(self, callback);
}


/**
 * @this DataObject
 * @param {DataContext} context
 * @param {Function} callback
 * @private
 */
function remove_(context, callback) {
    let self = this;
    //get current application
    let model = self.getModel();
    if (_.isNil(model)) {
        return callback.call(self, new DataError('E_MODEL', 'Data model cannot be found.'));
    }
    //register before listeners
    let beforeListeners = self.listeners('before.remove');
    for (let i = 0; i < beforeListeners.length; i++) {
        let beforeListener = beforeListeners[i];
        model.on('before.remove', beforeListener);
    }
    //register after listeners
    let afterListeners = self.listeners('after.remove');
    for (let j = 0; j < afterListeners.length; j++) {
        let afterListener = afterListeners[j];
        model.on('after.remove', afterListener);
    }
    model.remove(self, callback);
}


/**
 * @this DataObject
 * @param {string} name - The name of the attribute
 * @param {Function} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result.
 * @private
 */
function attrOf_(name, callback) {
    let self = this, model = this.$$model,
        mapping = model.inferMapping(name);
    if (_.isNil(mapping)) {
        if (hasOwnProperty(self, name)) {
            return callback(null, self[name]);
        } else {
            return model.where(model.primaryKey).equal(self[model.primaryKey]).select(name).value(function (err, result) {
                if (err) {
                    return callback(err); 
                }
                self[name] = result;
                return callback(null, result);
            });
        }
    }
    //if mapping association defines foreign key association
    if (mapping.associationType === 'association' && mapping.childModel === model.name) {
        //if object has already this property
        if (hasOwnProperty(self, name)) {
            //if property is an object
            if (typeof self[name] === 'object' && self[name] !== null) {
                //return the defined parent field
                callback(null, self[name][mapping.parentField]);
            } else if (self[name] === null) {
                callback();
            } else {
                callback(null, self[name]);
            }
        } else {
            //otherwise get value from db
            model.where(model.primaryKey).equal(this[model.primaryKey]).select(mapping.childField).flatten().value(function (err, result) {
                if (err) {
                    return callback(err); 
                }
                self[name] = result;
                return callback(null, result);
            });
        }
    } else {
        return callback();
    }
}


/**
 * @class
 * @classdesc Represents a data object associated with a data model.
 * DataObject class may be inherited by other classes that are defined as DataObjectClass of a data model.
 * @augments SequentialEventEmitter
 * @property {string} $$type - A string that represents the type of this object.
 * @property {DataModel} $$model - The data model which is associated with this object.
 * @property {*} $$id - Gets the identifier of this object based on the associated model's primary key
 */
class DataObject extends SequentialEventEmitter {
    /**
     * 
    * @param {string=} type
    * @param {*=} obj The object that is going to be extended
     */
    constructor(type, obj) {
        super();
        let self = this;
        /**
         * @name DataObject#context
         * @type DataContext
         * @description An instance of DataContext class associated with this object.
         */
        Object.defineProperty(this, 'context', {
            get: function () {
                return this[contextProperty]; 
            },
            set: function (value) {
                this[contextProperty] = value; 
            },
            enumerable: false,
            configurable: false
        });
        if (type) {
            this[typeProperty] = type;
        } else {
            if (hasOwnProperty(this.constructor, 'entityTypeDecorator')) {
                this[typeProperty] = this.constructor['entityTypeDecorator'];
            } else if (/Model$/.test(this.constructor.name)) {
                //get type from constructor name
                this[typeProperty] = this.constructor.name.replace(/Model$/, '');
            } else {
                if (this.constructor.name !== 'DataObject') {
                    this[typeProperty] = this.constructor.name;
                }
            }
        }
        Object.defineProperty(this, '$$type', {
            get: function () {
                return this[typeProperty];
            },
            set: function (value) {
                this[typeProperty] = value;
                delete this[modelProperty];
            },
            enumerable: false,
            configurable: false
        });

        Object.defineProperty(this, '$$id', {
            get: function () {
                if (self.context) {
                    let model = self.$$model;
                    if (model) {
                        return self[model.primaryKey];
                    }
                }
                //by default return id attribute, if any
                return self['id'];
            },
            enumerable: false,
            configurable: false
        });

        Object.defineProperty(this, '$$model', {
            get: function () {
                if (_.isNil(this[typeProperty])) {
                    return null;
                }
                if (this[modelProperty]) {
                    return this[modelProperty];
                }
                if (this.context) {
                    this[modelProperty] = this.context.model(this[typeProperty]);
                }
                return this[modelProperty];
            },
            enumerable: false,
            configurable: false
        });

        this[selectorsProperty] = {};
        /**
         * @name DataObject#selectors
         * @type Array.<Function>
         * @description A collection of selectors based on this data object.
         */
        Object.defineProperty(this, 'selectors', {
            get: function () {
                return this[selectorsProperty];
            },
            enumerable: false,
            configurable: false
        });

        this.selector('new',
            /**
             * @this DataObject
             * @param {Function} callback
             */
            function (callback) {
                if (typeof callback !== 'function') {
                    throw new Error(STR_MISSING_CALLBACK_ARGUMENT);
                }
                let self = this;
                let model = self.$$model;
                model.inferState(self, function (err, state) {
                    if (err) {
                        return callback(err); 
                    }
                    callback(null, (state === 1));
                });
            }).selector('live',
            /**
                 * @this DataObject
                 * @param {Function} callback
                 */
            function (callback) {
                if (typeof callback !== 'function') {
                    throw new Error(STR_MISSING_CALLBACK_ARGUMENT);
                }
                let self = this;
                let model = self.$$model;
                model.inferState(self, function (err, state) {
                    if (err) {
                        return callback(err); 
                    }
                    callback(null, (state === 2));
                });
            });

        if (typeof obj !== 'undefined' && obj !== null) {
            _.assign(this, obj);
        }

    }
    /**
     * Gets the identifier of this data object
     * @returns {*}
     */
    getId() {
        return this.$$id;
    }
    /**
     * Gets or sets data operation based on this data object in silent (unattended) mode
     * @param {boolean} value
     * @returns {DataObject}
     */
    silent(value) {
        let model = this.getModel();
        if (typeof model === 'undefined' || model === null) {
            throw new TypeError('Data model cannot be empty at this context');
        }
        model.silent(value);
        return this;
    }
    /**
     * Registers a selector for the current data object
     * @param {string} name
     * @param {function=} selector
     */
    selector(name, selector) {
        if (typeof name !== 'string') {
            throw new Error('Invalid argument. Expected string.');
        }
        if (typeof selector === 'undefined') {
            return this.selectors[name];
        }
        //get arguments
        this.selectors[name] = selector;
        return this;
    }
    /**
     * Executes a selector and returns the result. DataObject class has default selectors for common operations.
     * The ":new" selector checks whether current data object is new or not. The ":live" selector checks whether current data object already exists or not.
     * @param {string} selector - A string that represents an already registered selector
     * @returns {Promise<T>|*}
     */
    is(selector) {
        if (!/^:\w+$/.test(selector)) {
            throw new Error('Invalid selector. A valid selector should always start with : e.g. :new or :live.');
        }
        let fn = this.selectors[selector.substr(1)];
        if (typeof fn !== 'function') {
            throw new Error('The specified selector is no associated with this object.');
        }
        let self = this;
        return new Promise(function (resolve, reject) {
            fn.call(self, function (err, result) {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        });
    }
    /**
     * Gets the type of this data object.
     * @returns {string}
     */
    getType() {
        return this.$$type;
    }
    /**
     * Gets the associated data model
     * @returns {DataModel|*}
     */
    getModel() {
        return this.$$model;
    }
    /**
     * @param {String} name The relation name
     * @returns {DataQueryable|*}
     */
    property(name) {
        if (typeof name !== 'string') {
            return null;
        }
        let self = this, er;
        //validate relation based on the given name
        let model = self.$$model, field = model.field(name);
        if (_.isNil(field)) {
            er = new Error('The specified field cannot be found.'); er.code = 'E_DATA';
            throw er;
        }
        let mapping = model.inferMapping(field.name);
        if (_.isNil(mapping)) {
            //return queryable field value
            return {
                value: function (callback) {

                    function getValueWithCallback(callback) {
                        //if object has already an attribute with this name
                        if (hasOwnProperty(self, name)) {
                            //return attribute
                            return callback(null, self[name]);
                        } else {
                            //otherwise get attribute value
                            if (hasOwnProperty(self, model.primaryKey)) {
                                model.where(model.primaryKey).equal(self[model.primaryKey]).select(name).value(function (err, value) {
                                    if (err) {
                                        return callback(err); 
                                    }
                                    // set property
                                    self[name] = value;
                                    callback(null, value);
                                });
                            } else {
                                model.inferState(self, function (err, state) {
                                    if (err) {
                                        return callback(err); 
                                    }
                                    if (state === 2) {
                                        model.where(model.primaryKey).equal(self.getId()).select(name).value(function (err, value) {
                                            if (err) {
                                                return callback(err);
                                            }
                                            // set property
                                            self[name] = value;
                                            return callback(null, value);
                                        });
                                    } else {
                                        return callback(null);
                                    }
                                });
                            }
                        }
                    }
                    if (typeof callback === 'function') {
                        return getValueWithCallback(callback);
                    }
                    return new Promise(function (resolve, reject) {
                        return getValueWithCallback(function (err, value) {
                            if (err) {
                                return reject(err);
                            }
                            return resolve(value);
                        });
                    });

                }
            };
        }
        //validate field association
        if (mapping.associationType === 'association') {
            if (mapping.childField === field.name && mapping.childModel === model.name) {
                return new HasOneAssociation(self, mapping);
            } else {
                return new HasManyAssociation(self, mapping);
            }
        } else if (mapping.associationType === 'junction') {
            if (mapping.parentModel === model.name) {
                if (typeof mapping.childModel === 'undefined') {
                    return new DataObjectTag(self, mapping);
                } else {
                    return new DataObjectJunction(self, mapping);
                }
            } else {
                return new HasParentJunction(self, mapping);
            }
        } else {
            er = new Error('The association which is specified for the given field is not implemented.'); er.code = 'E_DATA';
            throw er;
        }
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Gets the value of the specified attribute.
     * If the object has already a property with the specified name and the property does not have
     * an association mapping then returns the property value.
     * Otherwise if attribute has an association mapping (it defines an association with another model) then
     * returns the foreign key value
     *
     * @param {string} name - The name of the attribute to retrieve
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result.
     * @returns {Promise<*>} If callback is missing then returns a promise.
     */
    attrOf(name, callback) {
        let self = this;
        if (typeof callback !== 'function') {
            return new Promise(function (resolve, reject) {
                return attrOf_.call(self, name, function (err, result) {
                    if (err) {
                        return reject(err); 
                    }
                    resolve(result);
                });
            });
        } else {
            return attrOf_.call(self, name, callback);
        }
    }
    /**
     * @param {string} name
     * @param {Function} callback
     */
    attr(name, callback) {
        if (hasOwnProperty(this, name)) {
            callback(null, this[name]);
        } else {
            let self = this, model = self.$$model, field = model.field(name);
            if (field) {
                let mapping = model.inferMapping(field.name);
                if (_.isNil(mapping)) {
                    if (self[model.primaryKey]) {
                        model.where(model.primaryKey).equal(self[model.primaryKey]).select(name).first(function (err, result) {
                            if (err) {
                                callback(err); return; 
                            }
                            let value = null;
                            if (result) {
                                value = result[name];
                            }
                            self[name] = value;
                            callback(null, value);
                        });
                    } else {
                        if (model.constraints.length === 0) {
                            callback(new DataError('E_VALUE', 'A value cannot be retrieved. The target data model has no constraints defined.', null, model.name , name));
                        } else {
                            let arr = model.constraints.filter(function (x) {
                                let valid = true;
                                if (x.fields.length === 0) {
                                    return false;
                                }
                                for (let i = 0; i < x.fields.length; i++) {
                                    let field = x.fields[i];
                                    if (hasOwnProperty(self, field) === false) {
                                        valid = false;
                                        break;
                                    }
                                }
                                return valid;
                            });
                            if (arr.length === 0) {
                                callback(new DataError('E_VALUE', 'A value cannot be retrieved. The target data model has constraints but the required properties are missing.', null, model.name, name));
                            } else {
                                //get first constraint
                                let constraint = arr[0];
                                /**
                                 * @type {DataQueryable}
                                 */
                                let q = null;
                                for (let i = 0; i < constraint.fields.length; i++) {
                                    let attr = constraint.fields[i];
                                    let value = self[attr];
                                    if (q === null) {
                                        q = model.where(attr).equal(value);
                                    } else {
                                        q.and(attr).equal(value);
                                    }
                                }
                                q.select(name).first(function (err, result) {
                                    if (err) {
                                        callback(err); return; 
                                    }
                                    let value = null;
                                    if (result) {
                                        value = result[name];
                                    }
                                    self[name] = value;
                                    callback(null, value);
                                });
                            }
                        }
                    }
                } else {
                    callback(null, self.property(name));
                }
            } else {
                callback(new Error('The specified field cannot be found.'));
            }

        }
    }
    /**
     *
     * @param {DataContext} context The current data context
     * @param {Function} fn - A function that represents the code to be invoked
     * @ignore
     */
    execute(context, fn) {
        let self = this;
        if (typeof fn !== 'function') {
            throw new TypeError('Wrong argument. Expected function.');
        }
        self.context = context;
        return fn.bind(self)();
    }
    /**
     * Gets a DataQueryable object that is going to be used in order to get related items.
     * @param attr {string} A string that contains the relation attribute
     * @returns {DataQueryable}
     */
    query(attr) {
        return this.property(attr);
    }
    /**
     * Saves the current data object.
     * @param {DataContext=}  context - The current data context.
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
     */
    save(context, callback) {
        let self = this;
        if (typeof callback !== 'function') {
            return new Promise(function (resolve, reject) {
                return save_.call(self, context || self.context, function (err) {
                    if (err) {
                        return reject(err); 
                    }
                    return resolve();
                });
            });
        } else {
            return save_.call(self, context || self.context, callback);
        }
    }
    /**
     * Deletes the current data object.
     * @param {DataContext=} context - The current data context.
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise.
     * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
     */
    remove(context, callback) {
        let self = this;
        if (typeof callback !== 'function') {

            return new Promise(function (resolve, reject) {
                return remove_.call(self, context || self.context, function (err) {
                    if (err) {
                        return reject(err); 
                    }
                    return resolve();
                });
            });
        } else {
            return remove_.call(self, context || self.context, callback);
        }
    }
    /*
     * Gets an instance of a DataModel class which represents the additional model that has been set in additionalType attribute of this data object.
     * @returns {Promise<DataModel>}
     */
    getAdditionalModel() {
        let self = this;
        return new Promise(function (resolve, reject) {
            try {
                let model = self.getModel();
                let attr = self.getModel().attributes.find(function (x) {
                    return x.name === 'additionalType'; 
                });
                if (typeof attr === 'undefined') {
                    return resolve();
                }
                let attrName = attr.property || attr.name;
                self.attr(attrName, function (err, additionalType) {
                    try {
                        if (err) {
                            return reject(err);
                        }
                        //if additional type is undefined
                        if (_.isNil(additionalType)) {
                            //return nothing
                            return resolve();
                        }
                        //if additional type is equal to current model
                        if (additionalType === model.name) {
                            //return nothing
                            return resolve(model);
                        }
                        return resolve(self.context.model(additionalType));
                    } catch (err) {
                        return reject(err);
                    }
                });
            } catch (err) {
                return reject(err);
            }
        });
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Gets an instance of data object which represents the additional typed object as this is defined in additionalType attribute.
     * @returns {Promise<DataObject>}
     */
    getAdditionalObject() {
        let self = this;
        return new Promise(function (resolve, reject) {
            try {
                self.getAdditionalModel().then(function (additionalModel) {
                    try {
                        if (_.isNil(additionalModel)) {
                            return resolve();
                        }
                        //if additional type is equal to current model
                        if (additionalModel.name === self.getModel().name) {
                            //return nothing
                            return resolve();
                        }
                        if (self.getModel().$silent) {
                            additionalModel.silent(); 
                        }
                        additionalModel.where(self.getModel().getPrimaryKey()).equal(self.getId()).first().then(function (result) {
                            if (result) {
                                return resolve(additionalModel.convert(result));
                            }
                            return resolve();
                        }).catch(function (err) {
                            return reject(err);
                        });
                    } catch (err) {
                        return reject(err);
                    }
                }).catch(function (err) {
                    return reject(err);
                });
            } catch (err) {
                return reject(err);
            }
        });
    }
}

module.exports = {
    DataObject
};

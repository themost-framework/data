const { isObjectDeep } = require('./is-object');
const {DataError} = require('@themost/common');
const { get: getProperty } = require('lodash');
const {DataQueryable} = require('./data-queryable');
/**
 * Gets property paths of an object tree. For example, given the following object:
 * {
 *   a: {
 *     b: 1,
 *     c: 2
 *   },
 *   d: 3
 * }
 * The function will return:
 * [
 *   'a.b',
 *   'a.c',
 *   'd'
 * ]
 * @param {*} tree
 * @returns {string[]}
 */
function paths(tree) {
    if (!isObjectDeep(tree)) {
        return [];
    }
    const properties = [];
    const walk = function(obj,path){
        path = path || '';
        for(var n in obj){
            if (Object.prototype.hasOwnProperty.call(obj, n)) {
                if(typeof obj[n] === 'object' || obj[n] instanceof Array) {
                    walk(obj[n],path + '.' + n);
                } else {
                    properties.push(path + '.' + n);
                }
            }
        }
    }
    walk(tree);
    return properties.map((p) => p.replace(/^\./, '')); // Remove leading dot
}

/**
 * Formats the given object to a find set for the target model. The function will try to find the best match for the object based on the primary key and unique constraints defined in the target model. If the object is a primitive value, it will be treated as a primary key value.
 * @param {import('./data-model').DataModel} targetModel
 * @param {*} obj
 */
function getSearchableObject(targetModel, obj) {
    var searchObject = {};
    if (isObjectDeep(obj)) {
        if (Object.prototype.hasOwnProperty.call(obj, targetModel.primaryKey)) {
            searchObject[targetModel.primaryKey] = obj[targetModel.primaryKey];
        } else {
            // get the first unique constraint
            var constraint = targetModel.constraints.find(function(x) {
                return x.type === 'unique';
            });
            // find by constraint
            if (constraint && Array.isArray(constraint.fields) && constraint.fields.length > 0) {
                //search for all constrained fields
                var findAttrs = {};
                constraint.fields.forEach(function(field) {
                    if (Object.prototype.hasOwnProperty.call(obj, field)) {
                        var value = obj[field];
                        if (isObjectDeep(value)) {
                            // get field mapping
                            const mapping = targetModel.inferMapping(field);
                            if (mapping == null) {
                                throw new DataError('ERR_VALUE', 'Expected a primitive value. Got object.', null, targetModel.name, field);
                            }
                            // if the value is an object, call _getFindSet recursively to get the find set for this object
                            const model = targetModel.context.model(mapping.parentModel);
                            if (model == null) {
                                throw new DataError('ERR_MODEL_NOT_FOUND', 'Model not found for the given association.', null, mapping.parentModel);
                            }
                            findAttrs[field] = getSearchableObject(model, value);
                        } else {
                            findAttrs[field] = value;
                        }
                    }
                });
                if (Object.keys(findAttrs).length === constraint.fields.length) {
                    // all constrained fields are found in the object, use them for find
                    return findAttrs;
                }
            }
            // enumerate attributes and find matching fields
            const attributes = targetModel.attributeNames;
            Object.keys(obj).filter(function(field) {
                return attributes.includes(field);
            }).forEach(function(field) {
                if (Object.prototype.hasOwnProperty.call(obj, field)) {
                    var value = obj[field];
                    if (isObjectDeep(value)) {
                        const attribute = targetModel.getAttribute(field);
                        if (attribute.type === 'Json') {
                            if (attribute.additionalType == null) {
                                // if the attribute is a json object, use it as is for find
                                searchObject[field] = value;
                            } else {
                                // if the attribute is a json object with additional type, try to find the model for the additional type
                                const model = targetModel.context.model(attribute.additionalType);
                                if (model == null) {
                                    throw new DataError('ERR_MODEL_NOT_FOUND', 'Model not found for the given additional type.', null, targetModel.name, field);
                                }
                                searchObject[field] = getSearchableObject(model, value);
                            }
                            return;
                        }
                        // get field mapping
                        const mapping = targetModel.inferMapping(field);
                        if (mapping == null) {
                            throw new DataError('ERR_VALUE', 'Expected a primitive value. Got object.', null, targetModel.name, field);
                        }
                        // if the value is an object, call _getFindSet recursively to get the find set for this object
                        const model = targetModel.context.model(mapping.parentModel);
                        if (model == null) {
                            throw new DataError('ERR_MODEL_NOT_FOUND', 'Model not found for the give association.', null, mapping.parentModel);
                        }
                        searchObject[field] = getSearchableObject(model, value);
                    } else {
                        searchObject[field] = value;
                    }
                }
            });
        }
    } else {
        searchObject[targetModel.primaryKey] = obj;
    }
    // if there is no key defined in find object set primary key to null (e.g. find by primary key with null value)
    if (Object.keys(searchObject).length === 0) {
        searchObject[targetModel.primaryKey] = null;
    }
    return searchObject;
}

class DataObjectFinder {
    /**
     * Creates an instance of DataObjectFinder.
     * @param {import('./data-model').DataModel} model
     */
    constructor(model) {
        Object.defineProperty(this, 'model', {
            configurable: false,
            enumerable: false,
            get: function() {
                return model;
            }
        })
    }

    /**
     * Creates an equivalent queryable for the given object. The queryable object will be used to find the original object in the data model.
     * @param {*} obj
     */
    find(obj) {
        const findObject = getSearchableObject(this.model, obj);
        const findSet = paths(findObject).reduce(function(acc, path) {
            var prop = path.split('.').join('/');
            Object.assign(acc, {
                [prop]: getProperty(findObject, path)
            });
            return acc;
        }, {});
        // get a last check if findSet is empty (e.g. find by primary key with null value)
        if (Object.keys(findSet).length === 0) {
            findSet[this.model.primaryKey] = null;
        }
        const q = new DataQueryable(this.model);
        for(var key in findSet) {
            if (Object.prototype.hasOwnProperty.call(findSet, key)) {
                if (q.query.$where == null) {
                    q.where(key).equal(findSet[key]);
                } else {
                    q.and(key).equal(findSet[key]);
                }
            }
        }
        return q;
    }

}

module.exports = {
    DataObjectFinder
};
const {DataAttributeResolver} = require('./data-attribute-resolver');
const {isObjectDeep} = require('./is-object');
const {sprintf} = require('sprintf-js');

/**
 * @class DataValueResolver
 * @param {import('./index').DataQueryable} target
 * @constructor
 */
function DataValueResolver(target) {
    Object.defineProperty(this, 'target', { get: function() {
            return target;
        }, configurable:false, enumerable:false});
}

DataValueResolver.prototype.resolve = function(value) {
    /**
     * @type {DataQueryable}
     */
    var target = this.target;
    if (typeof value === 'string' && /^\$it\//.test(value)) {
        var attr = value.replace(/^\$it\//,'');
        if (DataAttributeResolver.prototype.testNestedAttribute(attr)) {
            return DataAttributeResolver.prototype.resolveNestedAttribute.call(target, attr);
        }
        else {
            attr = DataAttributeResolver.prototype.testAttribute(attr);
            if (attr) {
                return target.fieldOf(attr.name);
            }
        }
    }
    if (isObjectDeep(value)) {
        // try to get in-process left operand
        // noinspection JSUnresolvedReference
        var left = target.query.privates && target.query.privates.property;
        if (typeof left === 'string' && /\./.test(left)) {
            var members = left.split('.');
            if (Array.isArray(members)) {
                // try to find member mapping
                /**
                 * @type {import('./data-model').DataModel}
                 */
                var model = target.model;
                var mapping;
                var attribute;
                var index = 0;
                var context = target.model.context;
                // if the first segment contains the view adapter name
                if (members[0] === target.model.viewAdapter) {
                    // move next
                    index++;
                } else if (target.query.$expand != null) {
                    // try to find if the first segment is contained in the collection of joined entities
                    var joins = Array.isArray(target.query.$expand) ? target.query.$expand : [ target.query.$expand ];
                    if (joins.length) {
                        var found = joins.find(function(x) {
                            return x.$entity && x.$entity.$as === members[0];
                        });
                        if (found) {
                            var mapping1 = model.inferMapping(found.$entity.$as);
                            if (mapping1 && mapping1.associationType === 'junction') {
                                // get next segment of members
                                var nextMember = members[index + 1];
                                if (nextMember === mapping1.associationObjectField) {
                                    // the next segment is the association object field
                                    // e.g. groups/group
                                    model = context.model(mapping1.parentModel);
                                    members[index + 1] = mapping1.parentField;
                                } else if (nextMember === mapping1.associationValueField) {
                                    // the next segment is the association value field
                                    // e.g. groups/user
                                    model = context.model(mapping1.childModel);
                                    members[index + 1] = mapping1.childField;
                                } else if (model.name === mapping1.parentModel) {
                                    model = context.model(mapping1.childModel);
                                } else {
                                    model = context.model(mapping1.parentModel);
                                }
                            } else if (found.$entity.model != null) {
                                model = context.model(found.$entity.model);
                            } else {
                                throw new Error(sprintf('Expected a valid mapping for property "%s"', found.$entity.$as));
                            }
                            index++;
                        }
                    }
                }

                var mapValue = function(x) {
                    if (Object.hasOwnProperty.call(x, name)) {
                        return x[name];
                    }
                    throw new Error(sprintf('Invalid value for property "%s"', members[members.length - 1]));
                }

                while (index < members.length) {
                    mapping = model.inferMapping(members[index]);
                    if (mapping) {
                        if (mapping.associationType === 'association' && mapping.childModel === model.name) {
                            model = context.model(mapping.parentModel);
                            if (model) {
                                attribute = model.getAttribute(mapping.parentField);
                            }
                        } else if (mapping.associationType === 'association' && mapping.parentModel === model.name) {
                            model = context.model(mapping.childModel);
                            if (model) {
                                attribute = model.getAttribute(mapping.childField);
                            }
                        } else if (mapping.associationType === 'junction' && mapping.childModel === model.name) {
                            model = context.model(mapping.parentModel);
                            if (model) {
                                attribute = model.getAttribute(mapping.parentField);
                            }
                        } else if (mapping.associationType === 'junction' && mapping.parentModel === model.name) {
                            model = context.model(mapping.childModel);
                            if (model) {
                                attribute = model.getAttribute(mapping.childField);
                            }
                        }
                    } else {
                        // if mapping is not found, and we are in the last segment
                        // try to find if this last segment is a field of the current model
                        if (index === members.length - 1) {
                            attribute = model.getAttribute(members[index]);
                            break;
                        }
                        attribute = null;
                        model = null;
                        break;
                    }
                    index++;
                }
                if (attribute) {
                    var name = attribute.property || attribute.name;
                    if (Array.isArray(value)) {
                        return value.map(function(x) {
                            return mapValue(x);
                        });
                    } else {
                        return mapValue(value);
                    }
                }
            }
        }
    }
    return value;
}

module.exports = { DataValueResolver };

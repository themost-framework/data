// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved
// eslint-disable-next-line no-unused-vars
const {Args, ConfigurationBase} = require('@themost/common');
const Q = require('q');
const pluralize = require('pluralize');
const _ = require('lodash');
const moment = require('moment');
const {parsers} = require('./types');
const parseBoolean = parsers.parseBoolean;
const {DataModel} = require('./data-model');
const {DataContext} = require('./types');
const {XDocument} = require('@themost/xml');
// noinspection JSUnusedLocalSymbols
const entityTypesProperty = Symbol('entityTypes');
// noinspection JSUnusedLocalSymbols
const entityContainerProperty = Symbol('entityContainer');
const ignoreEntityTypesProperty = Symbol('ignoredEntityTypes');
const builderProperty = Symbol('builder');
const entityTypeProperty = Symbol('entityType');
// noinspection JSUnusedLocalSymbols
const edmProperty = Symbol('edm');
const initializeProperty = Symbol('initialize');
const {DataConfigurationStrategy, SchemaLoaderStrategy, DefaultSchemaLoaderStrategy} = require('./data-configuration');
const {instanceOf} = require('./instance-of');
const {hasOwnProperty} = require('./has-own-property');


class EdmType {

}

EdmType.EdmBinary = 'Edm.Binary';
EdmType.EdmBoolean='Edm.Boolean';
EdmType.EdmByte='Edm.Byte';
EdmType.EdmDate='Edm.Date';
EdmType.EdmDateTimeOffset='Edm.DateTimeOffset';
EdmType.EdmDouble='Edm.Double';
EdmType.EdmDecimal='Edm.Decimal';
EdmType.EdmDuration='Edm.Duration';
EdmType.EdmGuid='Edm.Guid';
EdmType.EdmInt16='Edm.Int16';
EdmType.EdmInt32='Edm.Int32';
EdmType.EdmInt64='Edm.Int64';
EdmType.EdmSByte='Edm.SByte';
EdmType.EdmSingle='Edm.Single';
EdmType.EdmStream='Edm.Stream';
EdmType.EdmString='Edm.String';
EdmType.EdmTimeOfDay='Edm.TimeOfDay';
/**
 * @static
 * @param {*} type
 * @returns {string}
 */
EdmType.CollectionOf = function(type) {
    return 'Collection(' + type + ')';
};
/**
 * @static
 * @param {*} type
 * @returns {string}
 */
EdmType.IsCollection = function(type) {
    let match = /^Collection\((.*?)\)$/.exec(type);
    if (match && match[1].length) {
        return match[1];
    }
};

class EdmMultiplicity {

}
EdmMultiplicity.Many = 'Many';
EdmMultiplicity.One = 'One';
EdmMultiplicity.Unknown = 'Unknown';
EdmMultiplicity.ZeroOrOne = 'ZeroOrOne';
/**
 * @param {string} value
 * @returns {string|*}
 */
EdmMultiplicity.parse = function(value) {
    if (typeof value === 'string') {
        let re = new RegExp('^'+value+'$','ig');
        return _.find(_.keys(EdmMultiplicity), function(x) {
            if (typeof EdmMultiplicity[x] === 'string') {
                return re.test(EdmMultiplicity[x]);
            }
        });
    }
};

class EntitySetKind {
    static EntitySet() {
        return 'EntitySet';
    }
    static Singleton() {
        return 'Singleton';
    }
    static FunctionImport() {
        return 'FunctionImport';
    }
    static ActionImport() {
        return 'ActionImport';
    }
}

// noinspection JSUnusedGlobalSymbols
/**
 * @class
 * @param {string} name
 * @constructor
 */
class ProcedureConfiguration {
    constructor(name) {
        this.name = name;
        this.parameters = [];
        // noinspection JSUnusedGlobalSymbols
        this.isBound = false;
        this.isComposable = false;
    }
    /**
     * @param type
     * @returns {ProcedureConfiguration}
     */
    returns(type) {
        // noinspection JSUnusedGlobalSymbols
        this.returnType = type;
        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * @param type
     * @returns {ProcedureConfiguration}
     */
    returnsCollection(type) {
        // noinspection JSUnusedGlobalSymbols
        this.returnCollectionType = type;
        return this;
    }
    /**
     * @param {string} name
     * @param {string} type
     * @param {boolean=} nullable
     * @param {boolean=} fromBody
     */
    parameter(name, type, nullable, fromBody) {
        Args.notString(name, 'Action parameter name');
        Args.notString(type, 'Action parameter type');
        let findRe = new RegExp('^' + name + '$', 'ig');
        let p = _.find(this.parameters, function (x) {
            return findRe.test(x.name);
        });
        if (p) {
            p.type = type;
        } else {
            this.parameters.push({
                'name': name,
                'type': type,
                'nullable': _.isBoolean(nullable) ? nullable : false,
                'fromBody': fromBody
            });
        }
        return this;
    }
}

/**
 * @class
 * @constructor
 * @param {string} name
 * @augments ProcedureConfiguration
 * @extends ProcedureConfiguration
 */
class ActionConfiguration extends ProcedureConfiguration {
    constructor(name) {
        super(name);
        // noinspection JSUnusedGlobalSymbols
        this.isBound = false;
    }
}

/**
 * @class
 * @constructor
 * @param {string} name
 * @augments ProcedureConfiguration
 */
class FunctionConfiguration extends ProcedureConfiguration {
    constructor(name) {
        super(name);
        // noinspection JSUnusedGlobalSymbols
        this.isBound = false;
    }
}

/**
 * @class
 * @constructor
 * @param {EntityTypeConfiguration} entityType
 */
class EntityCollectionConfiguration {
    constructor(entityType) {
        this.actions = [];
        this.functions = [];
        this[entityTypeProperty] = entityType;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Creates an action that bind to this entity collection
     * @param {string} name
     * @returns ActionConfiguration
     */
    addAction(name) {
        /**
         * @type {ActionConfiguration|*}
         */
        let a = this.hasAction(name);
        if (a) {
            return a;
        }
        a = new ActionConfiguration(name);
        //add current entity as parameter
        a.parameter('bindingParameter', 'Collection(' + this[entityTypeProperty].name + ')', true);
        a.isBound = true;
        this.actions.push(a);
        return a;
    }
    /**
     * Checks if entity collection has an action with the given name
     * @param {string} name
     * @returns {ActionConfiguration|*}
     */
    hasAction(name) {
        if (_.isEmpty(name)) {
            return;
        }
        let findRe = new RegExp('^' + name + '$', 'ig');
        return _.find(this.actions, function (x) {
            return findRe.test(x.name);
        });
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Creates an action that bind to this entity collection
     * @param {string} name
     * @returns FunctionConfiguration
     */
    addFunction(name) {
        let a = this.hasFunction(name);
        if (a) {
            return a;
        }
        a = new FunctionConfiguration(name);
        a.isBound = true;
        a.parameter('bindingParameter', 'Collection(' + this[entityTypeProperty].name + ')', true);
        //add current entity as parameter
        this.functions.push(a);
        return a;
    }
    /**
     * Checks if entity collection has a function with the given name
     * @param {string} name
     * @returns {ActionConfiguration|*}
     */
    hasFunction(name) {
        if (_.isEmpty(name)) {
            return;
        }
        let findRe = new RegExp('^' + name + '$', 'ig');
        return _.find(this.functions, function (x) {
            return findRe.test(x.name);
        });
    }
}

function getOwnPropertyNames(obj) {
    if (typeof obj === 'undefined' || obj === null) {
        return [];
    }
    let ownPropertyNames = [];
    //get object methods
    let proto = obj;
    while(proto) {
        ownPropertyNames = ownPropertyNames.concat(Object.getOwnPropertyNames(proto).filter( function(x) {
            return ownPropertyNames.indexOf(x)<0;
        }));
        proto = Object.getPrototypeOf(proto);
    }
    if (typeof obj === 'function') {
        //remove caller
        let index = ownPropertyNames.indexOf('caller');
        if (index>=0) {
            ownPropertyNames.splice(index,1);
        }
        index = ownPropertyNames.indexOf('arguments');
        if (index>=0) {
            ownPropertyNames.splice(index,1);
        }
    }
    return ownPropertyNames;
}


/**
 * @class
 * @param {ODataModelBuilder} builder
 * @param {string} name
 * @constructor
 * @property {string} name - Gets the name of this entity type
 */
class EntityTypeConfiguration {
    constructor(builder, name) {

        Args.notString(name, 'Entity type name');
        Object.defineProperty(this, 'name', {
            get: function () {
                return name;
            }
        });
        this[builderProperty] = builder;
        this.property = [];
        this.ignoredProperty = [];
        this.navigationProperty = [];
        this.actions = [];
        this.functions = [];
        this.collection = new EntityCollectionConfiguration(this);

    }
    /**
     * @returns {ODataModelBuilder}
     */
    getBuilder() {
        return this[builderProperty];
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * @param {string} name
         * @returns EntityTypeConfiguration
         */
    derivesFrom(name) {
        Args.notString(name, 'Entity type name');
        this.baseType = name;
        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * Creates an action that bind to this entity type
         * @param {string} name
         * @returns ActionConfiguration
         */
    addAction(name) {
        /**
         * @type {ActionConfiguration|*}
         */
        let a = this.hasAction(name);
        if (a) {
            return a;
        }
        a = new ActionConfiguration(name);
        //add current entity as parameter
        a.parameter('bindingParameter', this.name);
        a.isBound = true;
        this.actions.push(a);
        return a;
    }
    /**
         * Checks if entity type has an action with the given name
         * @param {string} name
         * @returns {ActionConfiguration|*}
         */
    hasAction(name) {
        if (_.isEmpty(name)) {
            return;
        }
        let findRe = new RegExp('^' + name + '$', 'ig');
        return _.find(this.actions, function (x) {
            return findRe.test(x.name);
        });
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * Creates an action that bind to this entity type
         * @param {string} name
         * @returns FunctionConfiguration
         */
    addFunction(name) {
        let a = this.hasFunction(name);
        if (a) {
            return a;
        }
        a = new FunctionConfiguration(name);
        a.isBound = true;
        a.parameter('bindingParameter', this.name);
        //add current entity as parameter
        this.functions.push(a);
        return a;
    }
    /**
         * Checks if entity type has a function with the given name
         * @param {string} name
         * @returns {ActionConfiguration|*}
         */
    hasFunction(name) {
        if (_.isEmpty(name)) {
            return;
        }
        let findRe = new RegExp('^' + name + '$', 'ig');
        return _.find(this.functions, function (x) {
            return findRe.test(x.name);
        });
    }
    /**
         * Adds a new EDM primitive property to this entity type.
         * @param {string} name
         * @param {string} type
         * @param {boolean=} nullable,
         * @returns EntityTypeConfiguration
         */
    addProperty(name, type, nullable) {
        Args.notString(name, 'Property name');
        let exists = _.findIndex(this.property, function (x) {
            return x.name === name;
        });
        if (exists < 0) {
            let p = {
                'name': name,
                'type': type,
                'nullable': _.isBoolean(nullable) ? nullable : true
            };
            this.property.push(p);
        } else {
            _.assign(this.property[exists], {
                'type': type,
                'nullable': _.isBoolean(nullable) ? nullable : true
            });
        }
        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * Adds a new EDM navigation property to this entity type.
         * @param {string} name
         * @param {string} type
         * @param {string} multiplicity
         * @returns EntityTypeConfiguration
         */
    addNavigationProperty(name, type, multiplicity) {
        Args.notString(name, 'Property name');
        let exists = _.findIndex(this.navigationProperty, function (x) {
            return x.name === name;
        });

        let p = {
            'name': name,
            'type': (multiplicity === 'Many') ? `Collection(${type})` : type
        };
        if ((multiplicity === EdmMultiplicity.ZeroOrOne) || (multiplicity === EdmMultiplicity.Many)) {
            p.nullable = true;
        }

        if (exists < 0) {
            this.navigationProperty.push(p);
        } else {
            _.assign(this.navigationProperty[exists], p);
        }
        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * Removes the navigation property from the entity.
         * @param {string} name
         * @returns {EntityTypeConfiguration}
         */
    removeNavigationProperty(name) {
        Args.notString(name, 'Property name');
        let hasProperty = _.findIndex(this.property, function (x) {
            return x.name === name;
        });
        if (hasProperty >= 0) {
            this.property.splice(hasProperty, 1);
        }
        return this;
    }
    /**
         * Ignores a property from the entity
         * @param name
         * @returns {EntityTypeConfiguration}
         */
    ignore(name) {
        Args.notString(name, 'Property name');
        let hasProperty = _.findIndex(this.ignoredProperty, function (x) {
            return x.name === name;
        });
        if (hasProperty >= 0) {
            return this;
        }
        this.ignoredProperty.push(name);
        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * Removes the property from the entity.
         * @param {string} name
         * @returns {EntityTypeConfiguration}
         */
    removeProperty(name) {
        Args.notString(name, 'Property name');
        let hasProperty = _.findIndex(this.property, function (x) {
            return x.name === name;
        });
        if (hasProperty >= 0) {
            this.property.splice(hasProperty, 1);
        }
        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * Removes the property from the entity keys collection.
         * @param {string} name
         * @returns {EntityTypeConfiguration}
         */
    removeKey(name) {
        Args.notString(name, 'Key name');
        if (this.key && Array.isArray(this.key.propertyRef)) {
            let hasKeyIndex = _.findIndex(this.key.propertyRef, function (x) {
                return x.name === name;
            });
            if (hasKeyIndex < 0) {
                return this;
            }
            this.key.propertyRef.splice(hasKeyIndex, 1);
            return this;
        }
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * Configures the key property(s) for this entity type.
         * @param {string} name
         * @param {string} type
         * @returns {EntityTypeConfiguration}
         */
    hasKey(name, type) {
        this.addProperty(name, type, false);
        this.key = {
            propertyRef: [
                {
                    'name': name
                }
            ]
        };
        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {*} context
     * @param {*} any
     */
    mapInstance(context, any) {
        if (any == null) {
            return;
        }
        if (context) {
            let contextLink = this.getBuilder().getContextLink(context);
            if (contextLink) {
                return _.assign({
                    '@odata.context': contextLink + '#' + this.name
                }, any);
            }
        }
        return any;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {*} context
     * @param {string} property
     * @param {*} any
     */
    mapInstanceProperty(context, property, any) {
        let builder = this.getBuilder();
        if (context && typeof builder.getContextLink === 'function') {
            let contextLink = builder.getContextLink(context);
            if (contextLink) {
                if (context.request && context.request.url) {
                    contextLink += '#';
                    contextLink += context.request.url.replace(builder.serviceRoot, '');
                }
                return {
                    '@odata.context': contextLink,
                    'value': any
                };
            }
        }
        return {
            'value': any
        };
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param {*} context
     * @param {*} any
     * @returns {*}
     */
    mapInstanceSet(context, any) {
        let result = {};
        if (context) {
            let contextLink = this.getBuilder().getContextLink(context);
            if (contextLink) {
                result['@odata.context'] = contextLink + '#' + this.name;
            }
        }
        //search for total property for backward compatibility issues
        if (hasOwnProperty(any, 'total') && /^\+?\d+$/.test(any['total'])) {
            result['@odata.count'] = parseInt(any['total']);
        }
        if (hasOwnProperty(any, 'count') && /^\+?\d+$/.test(any['count'])) {
            result['@odata.count'] = parseInt(any['count']);
        }
        result['value'] = [];
        if (Array.isArray(any)) {
            result['value'] = any;
        } else if (Array.isArray(any.records)) {
            //search for records property for backward compatibility issues
            result['value'] = any.records;
        } else if (Array.isArray(any.value)) {
            result['value'] = any.value;
        }
        return result;
    }
}

/**
 * @class
 * @param {ODataModelBuilder} builder
 * @param {string} entityType
 * @param {string} name
 */
class EntitySetConfiguration {
    constructor(builder, entityType, name) {
        Args.check(builder instanceof ODataModelBuilder, new TypeError('Invalid argument. Configuration builder must be an instance of ODataModelBuilder class'));
        Args.notString(entityType, 'Entity Type');
        Args.notString(name, 'EntitySet Name');
        this[builderProperty] = builder;
        this[entityTypeProperty] = entityType;
        //ensure entity type
        if (!this[builderProperty].hasEntity(this[entityTypeProperty])) {
            this[builderProperty].addEntity(this[entityTypeProperty]);
        }
        this.name = name;
        this.kind = EntitySetKind.EntitySet;
        //use the given name as entity set URL by default
        this.url = name;

        Object.defineProperty(this, 'entityType', {
            get: function () {
                if (!this[builderProperty].hasEntity(this[entityTypeProperty])) {
                    return this[builderProperty].addEntity(this[entityTypeProperty]);
                }
                return this[builderProperty].getEntity(this[entityTypeProperty]);
            }
        });

        this.hasContextLink(
            /**
             * @this EntitySetConfiguration
             * @param context
             * @returns {string|*}
             */
            function (context) {
                let thisBuilder = this.getBuilder();
                if (_.isNil(thisBuilder)) {
                    return;
                }
                if (typeof thisBuilder.getContextLink !== 'function') {
                    return;
                }
                //get builder context link
                let builderContextLink = thisBuilder.getContextLink(context);
                if (builderContextLink) {
                    //add hash for entity set
                    return builderContextLink + '#' + this.name;
                }
            });

    }
    // noinspection JSUnusedGlobalSymbols
    hasUrl(url) {
        Args.notString(url, 'Entity Resource Path');
        this.url = url;
    }
    // noinspection JSUnusedGlobalSymbols
    getUrl() {
        return this.url;
    }
    /**
         * @returns {ODataModelBuilder}
         */
    getBuilder() {
        return this[builderProperty];
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * @returns {*}
         */
    getEntityTypePropertyList() {
        let result = {};
        _.forEach(this.entityType.property, function (x) {
            result[x.name] = x;
        });
        let baseEntityType = this.getBuilder().getEntity(this.entityType.baseType);
        while (baseEntityType) {
            _.forEach(baseEntityType.property, function (x) {
                result[x.name] = x;
            });
            baseEntityType = this.getBuilder().getEntity(baseEntityType.baseType);
        }
        return result;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * @param {string} name
         * @param  {boolean=} deep
         * @returns {*}
         */
    getEntityTypeProperty(name, deep) {
        let re = new RegExp('^' + name + '$', 'ig');
        let p = _.find(this.entityType.property, function (x) {
            return re.test(x.name);
        });
        if (p) {
            return p;
        }
        let deep_ = _.isBoolean(deep) ? deep : true;
        if (deep_) {
            let baseEntityType = this.getBuilder().getEntity(this.entityType.baseType);
            while (baseEntityType) {
                p = _.find(baseEntityType.property, function (x) {
                    return re.test(x.name);
                });
                if (p) {
                    return p;
                }
                baseEntityType = this.getBuilder().getEntity(baseEntityType.baseType);
            }
        }
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * @returns {*}
         */
    getEntityTypeIgnoredPropertyList() {
        let result = [].concat(this.entityType.ignoredProperty);
        let baseEntityType = this.getBuilder().getEntity(this.entityType.baseType);
        while (baseEntityType) {
            result.push.apply(result, baseEntityType.ignoredProperty);
            baseEntityType = this.getBuilder().getEntity(baseEntityType.baseType);
        }
        return result;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * @param {string} name
         * @param  {boolean=} deep
         * @returns {*}
         */
    getEntityTypeNavigationProperty(name, deep) {
        let re = new RegExp('^' + name + '$', 'ig');
        let p = _.find(this.entityType.navigationProperty, function (x) {
            return re.test(x.name);
        });
        if (p) {
            return p;
        }
        let deep_ = _.isBoolean(deep) ? deep : true;
        if (deep_) {
            let baseEntityType = this.getBuilder().getEntity(this.entityType.baseType);
            while (baseEntityType) {
                p = _.find(baseEntityType.navigationProperty, function (x) {
                    return re.test(x.name);
                });
                if (p) {
                    return p;
                }
                baseEntityType = this.getBuilder().getEntity(baseEntityType.baseType);
            }
        }
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * @returns {*}
         */
    getEntityTypeNavigationPropertyList() {
        let result = [];
        _.forEach(this.entityType.navigationProperty, function (x) {
            result[x.name] = x;
        });
        let baseEntityType = this.getBuilder().getEntity(this.entityType.baseType);
        while (baseEntityType) {
            _.forEach(baseEntityType.navigationProperty, function (x) {
                result[x.name] = x;
            });
            baseEntityType = this.getBuilder().getEntity(baseEntityType.baseType);
        }
        return result;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * @param contextLinkFunc
         */
    hasContextLink(contextLinkFunc) {
        // noinspection JSUnusedGlobalSymbols
        this.getContextLink = contextLinkFunc;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         *
         * @param {Function} idLinkFunc
         */
    hasIdLink(idLinkFunc) {
        // noinspection JSUnusedGlobalSymbols
        this.getIdLink = idLinkFunc;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         *
         * @param {Function} readLinkFunc
         */
    hasReadLink(readLinkFunc) {
        // noinspection JSUnusedGlobalSymbols
        this.getReadLink = readLinkFunc;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         *
         * @param {Function} editLinkFunc
         */
    hasEditLink(editLinkFunc) {
        // noinspection JSUnusedGlobalSymbols
        this.getEditLink = editLinkFunc;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {*} context
     * @param {*} any
     */
    mapInstance(context, any) {
        if (any == null) {
            return;
        }
        if (context) {
            let contextLink = this.getContextLink(context);
            if (contextLink) {
                return _.assign({
                    '@odata.context': contextLink + '/$entity'
                }, any);
            }
        }
        return any;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {*} context
     * @param {string} property
     * @param {*} any
     */
    mapInstanceProperty(context, property, any) {
        let builder = this.getBuilder();
        if (context && typeof builder.getContextLink === 'function') {
            let contextLink = builder.getContextLink(context);
            if (contextLink) {
                if (context.request && context.request.url) {
                    contextLink += '#';
                    contextLink += context.request.url.replace(builder.serviceRoot, '');
                }
                return {
                    '@odata.context': contextLink,
                    'value': any
                };
            }
        }
        return {
            'value': any
        };
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param {*} context
     * @param {*} any
     * @returns {*}
     */
    mapInstanceSet(context, any) {
        let result = {};
        if (context) {
            let contextLink = this.getContextLink(context);
            if (contextLink) {
                result['@odata.context'] = contextLink;
            }
        }
        //search for total property for backward compatibility issues
        if (hasOwnProperty(any, 'total') && /^\+?\d+$/.test(any['total'])) {
            result['@odata.count'] = parseInt(any['total']);
        } else if (hasOwnProperty(any, 'count') && /^\+?\d+$/.test(any['count'])) {
            result['@odata.count'] = parseInt(any['count']);
        }
        if (hasOwnProperty(any, 'skip') && /^\+?\d+$/.test(any['skip'])) {
            result['@odata.skip'] = parseInt(any['skip']);
        }
        result['value'] = [];
        if (Array.isArray(any)) {
            result['value'] = any;
        } else if (Array.isArray(any.records)) {
            //search for records property for backward compatibility issues
            result['value'] = any.records;
        } else if (Array.isArray(any.value)) {
            result['value'] = any.value;
        }
        return result;
    }
}

/**
 * @class
 * @param {*} builder
 * @param {string} entityType
 * @param {string} name
 * @constructor
 * @augments EntitySetConfiguration
 * @extends EntitySetConfiguration
 */
class SingletonConfiguration extends EntitySetConfiguration {
    constructor(builder, entityType, name) {
        super(builder, entityType, name)
        this.kind = EntitySetKind.Singleton;
    }
}

/**
 * Converts schema configuration to an edm document
 * @private
 * @this ODataModelBuilder
 * @param {SchemaConfiguration} schema
 * @returns {XDocument}
 */
function schemaToEdmDocument(schema) {
    let doc = new XDocument();
    let rootElement = doc.createElement('edmx:Edmx');
    rootElement.setAttribute('xmlns:edmx', 'http://docs.oasis-open.org/odata/ns/edmx');
    rootElement.setAttribute('Version','4.0');
    doc.appendChild(rootElement);
    let dataServicesElement = doc.createElement('edmx:DataServices');
    let schemaElement = doc.createElement('Schema');
    schemaElement.setAttribute('xmlns', 'http://docs.oasis-open.org/odata/ns/edm');
    if (schema.namespace) {
        schemaElement.setAttribute('Namespace', schema.namespace);
    }
    let actionElements = [], functionElements = [];
    //append edmx:DataServices > Schema
    dataServicesElement.appendChild(schemaElement);
    _.forEach(schema.entityType,
        /**
         *
         * @param {EntityTypeConfiguration} entityType
         */
        function(entityType) {

            //search for bound actions
            _.forEach(entityType.actions.concat(entityType.collection.actions), function(action) {
                let actionElement = doc.createElement('Action');
                actionElement.setAttribute('Name', action.name);
                actionElement.setAttribute('IsBound', true);
                if (action.isComposable) {
                    actionElement.setAttribute('IsComposable', action.isComposable);
                }
                _.forEach(action.parameters, function(parameter) {
                    let paramElement =  doc.createElement('Parameter');
                    paramElement.setAttribute('Name', parameter.name);
                    paramElement.setAttribute('Type', parameter.type);
                    let nullable = _.isBoolean(parameter.nullable) ? parameter.nullable : false;
                    if (!nullable) {
                        paramElement.setAttribute('Nullable', nullable);
                    }
                    //append Action > Parameter
                    actionElement.appendChild(paramElement)
                });
                if (action.returnType || action.returnCollectionType) {
                    let returnTypeElement =  doc.createElement('ReturnType');
                    let returnType = action.returnType;
                    if (action.returnCollectionType) {
                        returnType = action.returnCollectionType;
                        returnTypeElement.setAttribute('Type', `Collection(${returnType})`);
                    } else {
                        returnTypeElement.setAttribute('Type', returnType);
                    }
                    returnTypeElement.setAttribute('Nullable', true);
                    actionElement.appendChild(returnTypeElement);
                }
                actionElements.push(actionElement);
            });

            //search for bound functions
            _.forEach(entityType.functions.concat(entityType.collection.functions), function(func) {
                let functionElement = doc.createElement('Function');
                functionElement.setAttribute('Name', func.name);
                functionElement.setAttribute('IsBound', true);
                if (func.isComposable) {
                    functionElement.setAttribute('IsComposable', func.isComposable);
                }
                _.forEach(func.parameters, function(parameter) {
                    let paramElement =  doc.createElement('Parameter');
                    paramElement.setAttribute('Name', parameter.name);
                    paramElement.setAttribute('Type', parameter.type);
                    let nullable = _.isBoolean(parameter.nullable) ? parameter.nullable : false;
                    if (!nullable) {
                        paramElement.setAttribute('Nullable', nullable);
                    }
                    //append Function > Parameter
                    functionElement.appendChild(paramElement)
                });
                if (func.returnType || func.returnCollectionType) {
                    let returnTypeElement =  doc.createElement('ReturnType');
                    let returnType = func.returnType;
                    if (func.returnCollectionType) {
                        returnType = func.returnCollectionType;
                        returnTypeElement.setAttribute('Type', `Collection(${returnType})`);
                    } else {
                        returnTypeElement.setAttribute('Type', returnType);
                    }
                    returnTypeElement.setAttribute('Nullable', true);
                    functionElement.appendChild(returnTypeElement);
                }
                functionElements.push(functionElement);
            });

            //create element Schema > EntityType
            let entityTypeElement = doc.createElement('EntityType');
            entityTypeElement.setAttribute('Name', entityType.name);
            entityTypeElement.setAttribute('OpenType', true);
            if (entityType.baseType) {
                entityTypeElement.setAttribute('BaseType', entityType.baseType);
            }

            if (entityType.implements) {
                let implementsAnnotation = doc.createElement('Annotation');
                implementsAnnotation.setAttribute('Term', 'DataModel.OData.Core.V1.Implements');
                implementsAnnotation.setAttribute('String', entityType.implements);
                entityTypeElement.appendChild(implementsAnnotation);
            }

            if (entityType.key && entityType.key.propertyRef) {
                let keyElement = doc.createElement('Key');
                _.forEach(entityType.key.propertyRef, function(key) {
                    let keyRefElement = doc.createElement('PropertyRef');
                    keyRefElement.setAttribute('Name',key.name);
                    keyElement.appendChild(keyRefElement);
                });
                entityTypeElement.appendChild(keyElement);
            }
            //enumerate properties
            _.forEach(entityType.property, function(x) {
                let propertyElement = doc.createElement('Property');
                propertyElement.setAttribute('Name',x.name);
                propertyElement.setAttribute('Type',x.type);
                if (_.isBoolean(x.nullable) && (x.nullable===false)) {
                    propertyElement.setAttribute('Nullable',false);
                }
                // add annotations
                if (x.immutable) {
                    let immutableAnnotation = doc.createElement('Annotation');
                    immutableAnnotation.setAttribute('Term', 'Org.OData.Core.V1.Immutable');
                    immutableAnnotation.setAttribute('Tag', 'true');
                    propertyElement.appendChild(immutableAnnotation);
                }
                if (x.computed) {
                    let computedAnnotation = doc.createElement('Annotation');
                    computedAnnotation.setAttribute('Term', 'Org.OData.Core.V1.Computed');
                    computedAnnotation.setAttribute('Tag', 'true');
                    propertyElement.appendChild(computedAnnotation);
                }
                entityTypeElement.appendChild(propertyElement);
            });
            //enumerate navigation properties
            _.forEach(entityType.navigationProperty, function(x) {
                let propertyElement = doc.createElement('NavigationProperty');
                propertyElement.setAttribute('Name',x.name);
                propertyElement.setAttribute('Type',x.type);
                if (!x.nullable) {
                    propertyElement.setAttribute('Nullable',false);
                }
                if (x.immutable) {
                    let immutableAnnotation = doc.createElement('Annotation');
                    immutableAnnotation.setAttribute('Term', 'Org.OData.Core.V1.Immutable');
                    immutableAnnotation.setAttribute('Tag', 'true');
                    propertyElement.appendChild(immutableAnnotation);
                }
                if (x.computed) {
                    let computedAnnotation = doc.createElement('Annotation');
                    computedAnnotation.setAttribute('Term', 'Org.OData.Core.V1.Computed');
                    computedAnnotation.setAttribute('Tag', 'true');
                    propertyElement.appendChild(computedAnnotation);
                }
                entityTypeElement.appendChild(propertyElement);
            });
            //append Schema > EntityType
            schemaElement.appendChild(entityTypeElement);
        });

    //append action elements to schema
    _.forEach(actionElements, function(actionElement) {
        schemaElement.appendChild(actionElement);
    });
    //append function elements to schema
    _.forEach(functionElements, function(functionElement) {
        schemaElement.appendChild(functionElement);
    });

    //create Schema > EntityContainer
    let entityContainerElement = doc.createElement('EntityContainer');
    entityContainerElement.setAttribute('Name', schema.entityContainer.name || 'DefaultContainer');

    _.forEach(schema.entityContainer.entitySet,
        /**
         * @param {EntitySetConfiguration} child
         */
        function(child) {
            let childElement = doc.createElement(child.kind);
            childElement.setAttribute('Name', child.name);
            if ((child.kind === EntitySetKind.EntitySet) || (child.kind === EntitySetKind.Singleton)) {
                childElement.setAttribute('EntityType', child.entityType.name);
            }
            let childAnnotation = doc.createElement('Annotation');
            childAnnotation.setAttribute('Term', 'Org.OData.Core.V1.ResourcePath');
            childAnnotation.setAttribute('String', child.getUrl());
            childElement.appendChild(childAnnotation);
            //append Schema > EntityContainer > (EntitySet, Singleton, FunctionImport)
            entityContainerElement.appendChild(childElement);
        });

    //append Schema > EntityContainer
    schemaElement.appendChild(entityContainerElement);

    //append edmx:Edmx > edmx:DataServices
    rootElement.appendChild(dataServicesElement);
    return doc;

}


/**
 * @classdesc Represents the OData model builder of an HTTP application
 * @property {string} serviceRoot - Gets or sets the service root URI
 * @param {ConfigurationBase} configuration
 * @class
 */
class ODataModelBuilder {
    constructor(configuration) {

        this[entityTypesProperty] = {};
        this[ignoreEntityTypesProperty] = [];
        this[entityContainerProperty] = [];
        /**
         * @returns {ConfigurationBase}
         */
        this.getConfiguration = function () {
            return configuration;
        };
        let serviceRoot_;
        let self = this;
        Object.defineProperty(this, 'serviceRoot', {
            get: function () {
                return serviceRoot_;
            },
            set: function (value) {
                serviceRoot_ = value;
                if (typeof self.getContextLink === 'undefined') {
                    //set context link builder function
                    self.hasContextLink(function (context) {
                        let req = context.request;
                        let p = /\/$/g.test(serviceRoot_) ? serviceRoot_ + '$metadata' : serviceRoot_ + '/' + '$metadata';
                        if (req) {
                            return (req.protocol || 'http') + '://' + req.headers.host + p;
                        }
                        return p;
                    });
                }
            }
        });
    }
    /**
         * Gets a registered entity type
         * @param {string} name
         * @returns {EntityTypeConfiguration|*}
         */
    getEntity(name) {
        if (_.isNil(name)) {
            return;
        }
        Args.notString(name, 'Entity type name');
        return this[entityTypesProperty][name];
    }
    /**
         * Registers an entity type
         * @param {string} name
         * @returns {EntityTypeConfiguration}
         */
    addEntity(name) {
        if (!this.hasEntity(name)) {
            this[entityTypesProperty][name] = new EntityTypeConfiguration(this, name);
        }
        return this.getEntity(name);
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * @param {*} entityType
         * @param {string} name
         * @returns SingletonConfiguration|*
         */
    addSingleton(entityType, name) {
        if (!this.hasSingleton(name)) {
            this[entityContainerProperty].push(new SingletonConfiguration(this, entityType, name));
        }
        return this.getSingleton(name);
    }
    /**
         * Gets an entity set
         * @param name
         * @returns {SingletonConfiguration}
         */
    getSingleton(name) {
        Args.notString(name, 'Singleton Name');
        let re = new RegExp('^' + name + '$', 'ig');
        return _.find(this[entityContainerProperty], function (x) {
            return re.test(x.name) && x.kind === EntitySetKind.Singleton;
        });
    }
    /**
         * @param {string} name
         * @returns {SingletonConfiguration|*}
         */
    hasSingleton(name) {
        let findRe = new RegExp('^' + name + '$', 'ig');
        return _.findIndex(this[entityContainerProperty], function (x) {
            return findRe.test(x.name) && x.kind === EntitySetKind.Singleton;
        }) >= 0;
    }
    /**
         * Checks if the given entity set exists in entity container
         * @param {string} name
         * @returns {boolean}
         */
    hasEntitySet(name) {
        let findRe = new RegExp('^' + name + '$', 'ig');
        return _.findIndex(this[entityContainerProperty], function (x) {
            return findRe.test(x.name) && x.kind === EntitySetKind.EntitySet;
        }) >= 0;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * Registers an entity type
         * @param {string} entityType
         * @param {string} name
         * @returns {EntitySetConfiguration}
         */
    addEntitySet(entityType, name) {
        if (!this.hasEntitySet(name)) {
            this[entityContainerProperty].push(new EntitySetConfiguration(this, entityType, name));
        }
        return this.getEntitySet(name);
    }
    /**
     * Registers an entity type
     * @param {string} name
     * @returns {boolean}
     */
    removeEntitySet(name) {
        let findRe = new RegExp('^' + name + '$', 'ig');
        let index = _.findIndex(this[entityContainerProperty], function (x) {
            return findRe.test(x.name) && x.kind === EntitySetKind.EntitySet;
        });
        if (index >= 0) {
            this[entityContainerProperty].splice(index, 1);
            return true;
        }
        return false;
    }
    /**
         * Gets an entity set
         * @param name
         * @returns {EntitySetConfiguration}
         */
    getEntitySet(name) {
        Args.notString(name, 'EntitySet Name');
        let re = new RegExp('^' + name + '$', 'ig');
        return _.find(this[entityContainerProperty], function (x) {
            return re.test(x.name) && x.kind === EntitySetKind.EntitySet;
        });
    }
    /**
         * Gets an entity set based on the given entity name
         * @param {string} entityName
         * @returns {EntitySetConfiguration}
         */
    getEntityTypeEntitySet(entityName) {
        Args.notString(entityName, 'Entity Name');
        let re = new RegExp('^' + entityName + '$', 'ig');
        return _.find(this[entityContainerProperty], function (x) {
            return x.entityType && re.test(x.entityType.name);
        });
    }
    /**
         * Ignores the entity type with the given name
         * @param {string} name
         * @returns {ODataModelBuilder}
         */
    ignore(name) {
        let hasEntity = this[ignoreEntityTypesProperty].indexOf(name);
        if (hasEntity < 0) {
            this[ignoreEntityTypesProperty].push(name);
        }
        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * Checks if the given entity type exists in entity's collection
         * @param {string} name
         * @returns {boolean}
         */
    hasEntity(name) {
        return hasOwnProperty(this[entityTypesProperty], name);
    }
    /**
         * Creates and returns a structure based on the configuration performed using this builder
         * @returns {Promise}
         */
    getEdm() {
        let self = this;
        return Q.promise(function (resolve, reject) {
            try {
                let schema = {
                    entityType: [],
                    entityContainer: {
                        'name': 'DefaultContainer',
                        'entitySet': []
                    }
                };
                //get entity types by excluding ignored entities
                let keys = _.filter(_.keys(self[entityTypesProperty]), function (x) {
                    return self[ignoreEntityTypesProperty].indexOf(x) < 0;
                });
                //enumerate entity types
                _.forEach(keys, function (key) {
                    schema.entityType.push(self[entityTypesProperty][key]);
                });
                //apply entity sets
                schema.entityContainer.entitySet.push.apply(schema.entityContainer.entitySet, self[entityContainerProperty]);

                return resolve(schema);
            } catch (err) {
                return reject(err);
            }
        });
    }
    /**
     * Returns entity based on the configuration performed using this builder in
     * @returns {SchemaConfiguration}
     */
    getEdmSync() {
        let self = this;
        /**
         * @type {SchemaConfiguration}
         */
        let schema = {
            entityType: [],
            entityContainer: {
                'name': 'DefaultContainer',
                'entitySet': []
            }
        };
        //get entity types by excluding ignored entities
        let keys = _.filter(_.keys(self[entityTypesProperty]), function (x) {
            return self[ignoreEntityTypesProperty].indexOf(x) < 0;
        });
        //enumerate entity types
        _.forEach(keys, function (key) {
            schema.entityType.push(self[entityTypesProperty][key]);
        });
        //apply entity sets
        schema.entityContainer.entitySet.push.apply(schema.entityContainer.entitySet, self[entityContainerProperty]);
        return schema;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * @param {boolean=} all
         * @returns {ODataModelBuilder}
         */
    clean(all) {
        delete this[edmProperty];
        if (typeof all === 'boolean' && all === true) {
            delete this[initializeProperty];
            this[entityTypesProperty] = {};
            this[ignoreEntityTypesProperty] = [];
            this[entityContainerProperty] = [];
        }
        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * Creates and returns an XML structure based on the configuration performed using this builder
         * @returns {Promise<XDocument>}
         */
    getEdmDocument() {
        let self = this;
        return Q.promise(function (resolve, reject) {
            try {
                return self.getEdm().then(function (schema) {
                    let doc = schemaToEdmDocument.bind(self)(schema);
                    return resolve(doc);
                }).catch(function (err) {
                    return reject(err);
                });
            } catch (err) {
                return reject(err);
            }
        });
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Returns an XML structure based on the configuration performed using this builder
     * @returns {XDocument}
     */
    getEdmDocumentSync() {

        /**
         * get schema configuration
         * @type {SchemaConfiguration}
         */
        let schema = this.getEdmSync();
        // convert schema to edm document
        return schemaToEdmDocument.bind(this)(schema);
    }
    // noinspection JSUnusedGlobalSymbols
    /**
         * @param {Function} contextLinkFunc
         */
    hasContextLink(contextLinkFunc) {
        this.getContextLink = contextLinkFunc;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param jsonFormatterFunc
     */
    hasJsonFormatter(jsonFormatterFunc) {
        this.jsonFormatter = jsonFormatterFunc;
    }
}

















/**
     * @param {EntitySetConfiguration} entitySet
     * @param {*} context
     * @param {*} instance
     * @param {*=} options
     * @returns *
     */
ODataModelBuilder.prototype.jsonFormatter = function(context, entitySet, instance, options) {
    let self = this;
    let defaults = _.assign({
        addContextAttribute:true,
        addCountAttribute:false
    }, options);
    let entityProperty = entitySet.getEntityTypePropertyList();
    let entityNavigationProperty = entitySet.getEntityTypeNavigationPropertyList();
    let ignoredProperty = entitySet.getEntityTypeIgnoredPropertyList();
    let singleJsonFormatter = function(instance) {
        let result = {};
        _.forEach(_.keys(instance), function(key) {
            if (ignoredProperty.indexOf(key)<0) {
                if (hasOwnProperty(entityProperty, key)) {
                    let p = entityProperty[key];
                    if (p.type === EdmType.EdmBoolean) {
                        result[key] = parseBoolean(instance[key]);
                    } else if (p.type === EdmType.EdmDate) {
                        if (!_.isNil(instance[key])) {
                            result[key] = moment(instance[key]).format('YYYY-MM-DD');
                        }
                    } else if (p.type === EdmType.EdmDateTimeOffset) {
                        if (!_.isNil(instance[key])) {
                            result[key] = moment(instance[key]).format('YYYY-MM-DDTHH:mm:ssZ');
                        }
                    } else {
                        result[key] = instance[key];
                    }
                } else if (hasOwnProperty(entityNavigationProperty, key)) {
                    if (_.isObject(instance[key])) {
                        let match = /^Collection\((.*?)\)$/.exec(entityNavigationProperty[key].type);
                        let entityType = match ? match[1] : entityNavigationProperty[key].type;
                        let entitySet = self.getEntityTypeEntitySet(/\.?(\w+)$/.exec(entityType)[1]);
                        result[key] = self.jsonFormatter(context, entitySet, instance[key], {
                            addContextAttribute:false
                        });
                    }
                } else {
                    result[key] = instance[key];
                }
            }
        });
        return result;
    };
    let value;
    let result = {};
    if (defaults.addContextAttribute) {
        _.assign(result, {
            '@odata.context':self.getContextLink(context).concat('$metadata#', entitySet.name)
        });
    }
    if (Array.isArray(instance)) {
        value = _.map(instance, function(x) {
            return singleJsonFormatter(x);
        });
        _.assign(result, {
            'value':value
        });
    } else if (_.isObject(instance)) {
        value = singleJsonFormatter(instance);
        if (defaults.addContextAttribute) {
            _.assign(result, {
                '@odata.context':self.getContextLink(context).concat('$metadata#', entitySet.name, '/$entity')
            });
        }
        _.assign(result, value);
    }
    return result;
};

/**
 * @class
 * @returns {*}
 * @constructor
 * @param {ConfigurationBase} configuration
 * @augments DataContext
 * @extends DataContext
 */
class EntityDataContext extends DataContext {
    constructor(configuration) {
        super();
        /**
         * @returns {ConfigurationBase}
         */
        this.getConfiguration = function () {
            return configuration;
        };
    }
    model(name) {
        let strategy = this.getConfiguration().getStrategy(DataConfigurationStrategy);
        if (hasOwnProperty(strategy.dataTypes, name)) {
            return;
        }
        let definition = strategy.model(name);
        if (_.isNil(definition)) {
            return;
        }
        let res = new DataModel(definition);
        res.context = this;
        return res;
    }
}



/**
 * @class
 * @param {DataConfiguration} configuration
 * @augments ODataModelBuilder
 * @extends ODataModelBuilder
 */
class ODataConventionModelBuilder extends ODataModelBuilder {
    constructor(configuration) {
        super(configuration);
    }
    /**
         * Automatically registers an entity type from the given model
         * @param {string} entityType
         * @param {string} name
         * @returns {EntitySetConfiguration}
         */
    addEntitySet(entityType, name) {
        let self = this;
        // noinspection JSPotentiallyInvalidConstructorUsage
        let superAddEntitySet = super.addEntitySet;
        /**
         * @type {EntityTypeConfiguration}
         */
        if (this.hasEntitySet(name)) {
            return this.getEntitySet(name);
        }
        /**
         * @type {DataConfigurationStrategy}
         */
        let strategy = self.getConfiguration().getStrategy(DataConfigurationStrategy);
        if (strategy) {
            /**
             * @type {EntitySetConfiguration}
             */
            let modelEntitySet = superAddEntitySet.bind(self)(entityType, name);
            /**
             * @type {EntityTypeConfiguration}
             */
            let modelEntityType = modelEntitySet.entityType;
            /**
             * @type {DataModel}
             */
            let definition = strategy.model(entityType);
            if (definition) {
                /**
                 * @type {DataModel}
                 */
                let model = new DataModel(definition);
                model.context = new EntityDataContext(self.getConfiguration());
                let inheritedAttributes = [];
                let primaryKey = _.find(model.attributes, function (x) {
                    return x.primary;
                });
                if (model.inherits) {
                    //add base entity
                    self.addEntitySet(model.inherits, pluralize(model.inherits));
                    //set inheritance
                    modelEntityType.derivesFrom(model.inherits);
                    let baseModel = model.base();
                    if (baseModel) {
                        inheritedAttributes = baseModel.attributeNames;
                    }
                }
                // add implements property
                if (model.implements) {
                    Object.defineProperty(modelEntityType, 'implements', {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: model.implements
                    });
                }
                _.forEach(_.filter(model.attributes, function (x) {
                    if (x.primary && model.inherits) {
                        return false;
                    }
                    return (x.model === model.name) && (inheritedAttributes.indexOf(x.name) < 0);
                }), function (x) {
                    let name = x.property || x.name;
                    let mapping = model.inferMapping(x.name);
                    let findProperty = null;
                    if (_.isNil(mapping)) {
                        //find data type
                        let dataType = strategy.dataTypes[x.type];
                        //add property
                        let edmType = _.isObject(dataType) ? (hasOwnProperty(dataType, 'edmtype') ? dataType['edmtype'] : 'Edm.' + x.type) : x.type;
                        modelEntityType.addProperty(name, edmType, hasOwnProperty(x, 'nullable') ? x.nullable : true);
                        if (x.primary) {
                            modelEntityType.hasKey(name, edmType);
                        }
                        // get entity type property
                        findProperty = modelEntityType.property.find(p => {
                            return p.name === name;
                        });
                    } else {
                        let namespacedType = x.type;
                        //add navigation property
                        let isNullable = hasOwnProperty(x, 'nullable') ? x.nullable : true;
                        // add an exception for one-to-one association
                        if (x.multiplicity === EdmMultiplicity.ZeroOrOne || x.multiplicity === EdmMultiplicity.One) {
                            modelEntityType.addNavigationProperty(name, namespacedType, x.multiplicity);
                        } else {
                            modelEntityType.addNavigationProperty(name, namespacedType, x.many ? EdmMultiplicity.Many : (isNullable ? EdmMultiplicity.ZeroOrOne : EdmMultiplicity.One));
                        }
                        //add navigation property entity (if type is not a primitive type)
                        if (!hasOwnProperty(strategy.dataTypes, x.type)) {
                            self.addEntitySet(x.type, pluralize(x.type));
                        }
                        // get entity type navigationProperty
                        findProperty = modelEntityType.navigationProperty.find(p => {
                            return p.name === name;
                        });
                    }
                    // add annotations to property of navigationProperty
                    if (findProperty) {
                        // add immutable annotation
                        if (!!x.primary === false && Object.prototype.hasOwnProperty.call(x, 'editable')) {
                            if (x.editable === false) {
                                Object.defineProperty(findProperty, 'immutable', {
                                    configurable: true,
                                    enumerable: true,
                                    writable: true,
                                    value: true
                                });
                            }
                        }
                        // add computed annotation
                        if (Object.prototype.hasOwnProperty.call(x, 'calculation')) {
                            Object.defineProperty(findProperty, 'computed', {
                                configurable: true,
                                enumerable: true,
                                writable: true,
                                value: true
                            });
                        }
                        // if attribute is readonly and has default value
                        if (!!x.primary === false && x.readonly === true && Object.prototype.hasOwnProperty.call(x, 'value')) {
                            // set computed attribute
                            Object.defineProperty(findProperty, 'computed', {
                                configurable: true,
                                enumerable: true,
                                writable: true,
                                value: true
                            });
                        }
                    }
                });
                //enumerate functions
                let DataObjectClass = model.getDataObjectType();
                //get static functions
                let ownFunctions = EdmMapping.getOwnFunctions(DataObjectClass);
                _.forEach(ownFunctions, function (x) {
                    modelEntityType.collection.addFunction(x.name);
                    _.assign(modelEntityType.collection.hasFunction(x.name), x);
                });
                //get instance functions
                ownFunctions = EdmMapping.getOwnFunctions(DataObjectClass.prototype);
                _.forEach(ownFunctions, function (x) {
                    modelEntityType.addFunction(x.name);
                    _.assign(modelEntityType.hasFunction(x.name), x);
                });
                //get static actions
                let ownActions = EdmMapping.getOwnActions(DataObjectClass);
                _.forEach(ownActions, function (x) {
                    modelEntityType.collection.addAction(x.name);
                    _.assign(modelEntityType.collection.hasAction(x.name), x);
                });
                //get instance actions
                ownActions = EdmMapping.getOwnActions(DataObjectClass.prototype);
                _.forEach(ownActions, function (x) {
                    modelEntityType.addAction(x.name);
                    _.assign(modelEntityType.hasAction(x.name), x);
                });
                //add link function
                if (typeof self.getContextLink === 'function') {
                    modelEntitySet.hasContextLink(function (context) {
                        return self.getContextLink(context).concat('$metadata#', modelEntitySet.name);
                    });
                }
                //add id link
                if (typeof self.getContextLink === 'function') {
                    if (primaryKey) {
                        modelEntitySet.hasIdLink(function (context, instance) {
                            //get parent model
                            if (_.isNil(instance[primaryKey.name])) {
                                return;
                            }
                            return self.getContextLink(context).concat(modelEntitySet.name, '(', instance[primaryKey.name], ')');
                        });
                    }
                }
                //add read link
                if (typeof self.getContextLink === 'function') {
                    if (primaryKey) {
                        modelEntitySet.hasReadLink(function (context, instance) {
                            //get parent model
                            if (_.isNil(instance[primaryKey.name])) {
                                return;
                            }
                            return self.getContextLink(context).concat(modelEntitySet.name, '(', instance[primaryKey.name], ')');
                        });
                    }
                }
            }
            return modelEntitySet;
        }
        return superAddEntitySet.bind(self)(entityType, name);
    }
    /**
     * @returns Promise|*
     */
    initialize() {
        let self = this;
        if (self[initializeProperty]) {
            return Q.resolve();
        }
        return Q.promise(function (resolve, reject) {
            try {
                /**
                 * @type {*|DataConfigurationStrategy}
                 */
                let dataConfiguration = self.getConfiguration().getStrategy(DataConfigurationStrategy);
                let schemaLoader = self.getConfiguration().getStrategy(SchemaLoaderStrategy);
                if (instanceOf(schemaLoader, DefaultSchemaLoaderStrategy)) {
                    // read models
                    let models = schemaLoader.readSync();
                    // use loaders of DefaultSchemaLoaderStrategy
                    if (schemaLoader.loaders) {
                        _.forEach(schemaLoader.loaders,
                            /**
                             * @param {SchemaLoaderStrategy} loader
                             */
                            function (loader) {
                                // get loader models
                                let otherModels = loader.readSync();
                                if (otherModels && otherModels.length) {
                                    // get new models provided by loader
                                    let addModels = _.filter(otherModels, function (otherModel) {
                                        return models.indexOf(otherModel) < 0;
                                    });
                                    // add those models
                                    models.push.apply(models, addModels);
                                }
                            });
                    }
                    _.forEach(models, function (x) {
                        if (!_.isNil(x)) {
                            self.addEntitySet(x, pluralize(x));
                        }
                    });
                    //remove hidden models from entity set container
                    for (let i = 0; i < self[entityContainerProperty].length; i++) {
                        let x = self[entityContainerProperty][i];
                        //get model
                        let entityTypeName = x.entityType.name;
                        let definition = dataConfiguration.model(x.entityType.name);
                        if (definition && definition.hidden) {
                            self.removeEntitySet(x.name);
                            if (!definition.abstract) {
                                self.ignore(entityTypeName);
                            }
                            i -= 1;
                        }
                    }
                }
                self[initializeProperty] = true;
                return resolve();
            } catch (err) {
                return reject(err);
            }
        });
    }
    /**
     * @returns *
     */
    initializeSync() {
        let self = this;
        if (self[initializeProperty]) {
            return;
        }
        /**
         * @type {*|DataConfigurationStrategy}
         */
        let dataConfiguration = self.getConfiguration().getStrategy(DataConfigurationStrategy);
        let schemaLoader = self.getConfiguration().getStrategy(SchemaLoaderStrategy);
        if (instanceOf(schemaLoader, DefaultSchemaLoaderStrategy)) {
            // read models
            let models = schemaLoader.readSync();
            // use loaders of DefaultSchemaLoaderStrategy
            if (schemaLoader.loaders) {
                _.forEach(schemaLoader.loaders,
                    /**
                     * @param {SchemaLoaderStrategy} loader
                     */
                    function (loader) {
                        // get loader models
                        let otherModels = loader.readSync();
                        if (otherModels && otherModels.length) {
                            // get new models provided by loader
                            let addModels = _.filter(otherModels, function (otherModel) {
                                return models.indexOf(otherModel) < 0;
                            });
                            // add those models
                            models.push.apply(models, addModels);
                        }
                    });
            }
            // add entity set
            _.forEach(models, function (x) {
                if (!_.isNil(x)) {
                    self.addEntitySet(x, pluralize(x));
                }
            });
            //remove hidden models from entity set container
            for (let i = 0; i < self[entityContainerProperty].length; i++) {
                let x = self[entityContainerProperty][i];
                //get model
                let entityTypeName = x.entityType.name;
                let definition = dataConfiguration.model(x.entityType.name);
                if (definition && definition.hidden) {
                    self.removeEntitySet(x.name);
                    if (!definition.abstract) {
                        self.ignore(entityTypeName);
                    }
                    i -= 1;
                }
            }
        }
        self[initializeProperty] = true;
    }
    /**
         * Creates and returns a structure based on the configuration performed using this builder
         * @returns {Promise|*}
         */
    getEdm() {
        // noinspection JSPotentiallyInvalidConstructorUsage
        let self = this, superGetEdm = super.getEdm;
        try {
            if (_.isObject(self[edmProperty])) {
                return Q.resolve(self[edmProperty]);
            }
            return self.initialize().then(function () {
                return superGetEdm.bind(self)().then(function (result) {
                    self[edmProperty] = result;
                    return Q.resolve(self[edmProperty]);
                });
            });
        } catch (err) {
            return Q.reject(err);
        }
    }
    /**
     * Returns schema based on the configuration performed with this builder
     * @returns {SchemaConfiguration}
     */
    getEdmSync() {
        // noinspection JSPotentiallyInvalidConstructorUsage
        let superGetEdmSync = super.getEdmSync;
        if (_.isObject(this[edmProperty])) {
            return this[edmProperty];
        }
        // use sync initialization
        this.initializeSync();
        // get edm (and store schema configuration for future calls)
        this[edmProperty] = superGetEdmSync.bind(this)();
        // return schema configuration
        return this[edmProperty];
    }
}

/**
 *
 * @param {Object|Function} proto - The constructor function of a class or the prototype of a class
 * @param {string} key - The name of the property or method where the decorator will be included
 * @param {Function} decorator - The decorator to be included
 */
function defineDecorator(proto, key, decorator) {
    if ((typeof proto !== 'object') && (typeof proto !== 'function')) {
        throw new TypeError('Invalid prototype. Expected object or function.');
    }
    if (typeof key !== 'string') {
        throw new TypeError('Invalid property name. Expected string or function.');
    }
    if (typeof decorator !== 'function') {
        throw new TypeError('Invalid decorator. Expected function.');
    }
    decorator(proto, key, Object.getOwnPropertyDescriptor(proto, key));
}
//extend object
if (typeof Object.defineDecorator === 'undefined') {
    /**
     * @function defineDecorator
     * @param {Object|Function} proto - The constructor function of a class or the prototype of a class
     * @param {string} key - The name of the property or method where the decorator will be included
     * @param {Function} decorator - The decorator to be included
     * @memberOf Object
     * @static
     */
    Object.defineDecorator = defineDecorator;
}

/**
 * @class
 * @constructor
 */
class EdmMapping {
    //
}

/**
 * @static
 * Maps a prototype to an OData entity type
 * @param {string} name
 * @returns {Function}
 */
EdmMapping.entityType = function (name) {
    if (typeof name !== 'string') {
        throw new TypeError('Entity type must be a string');
    }
    return function (target, key, descriptor) {
        if (typeof target === 'function') {
            target.entityTypeDecorator = name;
        } else {
            throw new Error('Decorator is not valid on this declaration type.');
        }
        return descriptor;
    }
};

/**
 * @static
 * Maps a function to an OData entity type action
 * @param {string} name
 * @param {*=} returnType
 * @returns {Function}
 */
EdmMapping.action = function (name, returnType) {
    if (typeof name !== 'string') {
        throw new TypeError('Action name must be a string');
    }
    return function (target, key, descriptor) {
        if (typeof descriptor.value !== 'function') {
            throw new Error('Decorator is not valid on this declaration type.');
        }
        let action =  new ActionConfiguration(name);
        action.isBound = true;
        if (typeof returnType === 'string') {
            let match = /^Collection\(([a-zA-Z0-9._]+)\)$/ig.exec(returnType);
            if (match) {
                action.returnsCollection(match[1])
            } else {
                action.returns(returnType);
            }
        } else if (typeof returnType === 'function') {
            if (typeof returnType.entityTypeDecorator === 'string') {
                action.returns(returnType.entityTypeDecorator);
            } else {
                action.returns(returnType.name);
            }
        }
        if (typeof target === 'function') {
            //bound to collection
            action.parameter('bindingParameter',EdmType.CollectionOf(target.entityTypeDecorator || target.name));
        } else {
            action.parameter('bindingParameter',target.entityTypeDecorator || target.constructor.name);
        }
        descriptor.value.actionDecorator = action;
        return descriptor;
    }
};
/**
 * @static
 * Maps a function to an OData entity type function
 * @param {string} name
 * @param {*=} returnType
 * @returns {Function}
 */
EdmMapping.func = function (name, returnType) {
    if (typeof name !== 'string') {
        throw new TypeError('Function name must be a string');
    }
    return function (target, key, descriptor) {
        if (typeof descriptor.value !== 'function') {
            throw new Error('Decorator is not valid on this declaration type.');
        }
        let func =  new FunctionConfiguration(name);
        func.isBound = true;
        if (typeof returnType === 'string') {
            let match = /^Collection\(([a-zA-Z0-9._]+)\)$/ig.exec(returnType);
            if (match) {
                func.returnsCollection(match[1]);
            } else {
                func.returns(returnType);
            }
        } else if (typeof returnType === 'function') {
            if (typeof returnType.entityTypeDecorator === 'string') {
                func.returns(returnType.entityTypeDecorator);
            } else {
                func.returns(returnType.name);
            }
        }
        if (typeof target === 'function') {
            //bound to collection
            func.parameter('bindingParameter',EdmType.CollectionOf(target.entityTypeDecorator || target.name));
        } else {
            func.parameter('bindingParameter',target.entityTypeDecorator || target.constructor.name);
        }
        descriptor.value.functionDecorator = func;
        return descriptor;
    }
};


/**
 * @static
 * Defines a data action parameter of an already mapped OData entity type action
 * @param {string} name
 * @param {*} type
 * @param {boolean=} nullable
 * @param {boolean=} fromBody
 * @returns {Function}
 */
EdmMapping.param = function(name, type, nullable, fromBody) {
    if (typeof name !== 'string') {
        throw new TypeError('Parameter name must be a string');
    }
    return function (target, key, descriptor) {
        if (typeof type !== 'string' && typeof type !== 'function') {
            throw new TypeError('Parameter type must be a string or function');
        }
        if (typeof descriptor.value !== 'function') {
            throw new Error('Decorator is not valid on this declaration type.');
        }
        //get parameter  type
        let typeString;
        if (typeof type === 'function') {
            if (typeof type.entityTypeDecorator === 'string') {
                typeString = type.entityTypeDecorator;
            } else {
                typeString = type.name;
            }
        } else if (typeof type === 'string') {
            typeString = type;
        }
        if (instanceOf(descriptor.value.actionDecorator, ActionConfiguration)) {
            descriptor.value.actionDecorator.parameter(name, typeString, nullable, fromBody);
        } else if (instanceOf(descriptor.value.functionDecorator, FunctionConfiguration)) {
            descriptor.value.functionDecorator.parameter(name, typeString, nullable, fromBody);
        } else {
            throw new Error('Procedure configuration cannot be empty for this member. Expected EdmMapping.action(name, returnType) or EdmMapping.func(name, returnType) decorator.');
        }
        return descriptor;
    }
};


/**
 * @static
 * Defines the getter of a dynamic navigation property
 * @param {string} name
 * @param {string} type
 * @param {string=} multiplicity
 * @returns {Function}
 */
EdmMapping.navigationProperty = function(name, type, multiplicity) {
    if (typeof name !== 'string') {
        throw new TypeError('Action name must be a string');
    }
    return function (target, key, descriptor) {
        if (typeof descriptor.value !== 'function') {
            throw new Error('Decorator is not valid on this declaration type.');
        }
        let propMultiplicity = EdmMultiplicity.ZeroOrOne;
        if (typeof multiplicity !== 'undefined' && typeof multiplicity !== 'string') {
            throw new TypeError('Multiplicity must be a string');
        }
        if (typeof multiplicity === 'string') {
            propMultiplicity = EdmMultiplicity.parse(multiplicity) || EdmMultiplicity.Unknown;
        }
        descriptor.value.navigationPropertyDecorator =  {
            'name': name,
            'type': type,
            'multiplicity': propMultiplicity
        };
    }
};

/**
 * @static
 * Maps an object property to an OData entity type property
 * @param {string} name
 * @param {string} type
 * @param {boolean=} nullable
 * @returns {Function}
 */
EdmMapping.property = function(name, type, nullable) {
    if (typeof name !== 'string') {
        throw new TypeError('Action name must be a string');
    }
    return function (target, key, descriptor) {
        descriptor.value.propertyDecorator =  {
            'name': name,
            'type': type,
            'nullable': _.isBoolean(nullable) ? nullable : false
        };
    }
};


/**
 * @static
 * Validates if the given object instance has a mapped OData action with the given name.
 * @param {*} obj
 * @param {string} name
 * @returns Function|*
 */
EdmMapping.hasOwnAction = function(obj, name) {
    if (typeof obj !== 'object' && typeof obj !== 'function') {
        return;
    }
    let re = new RegExp('^' + name + '$', 'ig');
    let functionName = _.find(getOwnPropertyNames(obj), function(x) {
        return (typeof obj[x] === 'function') && (instanceOf(obj[x].actionDecorator, ActionConfiguration)) && re.test(obj[x].actionDecorator.name);
    });
    if (functionName) {
        return obj[functionName];
    }
};

/**
 * @static
 * Validates if the given object instance has a dynamic navigation property getter with the specified name.
 * @param {*} obj
 * @param {string} name
 * @returns Function|*
 */
EdmMapping.hasOwnNavigationProperty = function(obj, name) {
    if (typeof obj !== 'object' && typeof obj !== 'function') {
        return;
    }
    let re = new RegExp('^' + name + '$', 'ig');
    let functionName = _.find(getOwnPropertyNames(obj), function(x) {
        return (typeof obj[x] === 'function') && (typeof obj[x].navigationPropertyDecorator === 'object')  && re.test(obj[x].navigationPropertyDecorator.name);
    });
    if (functionName) {
        return obj[functionName];
    }
};

/**
 * @static
 * Validates if the given object instance has a mapped OData function with the given name.
 * @param {*} obj
 * @param {string} name
 * @returns Function|*
 */
EdmMapping.hasOwnFunction = function(obj, name) {
    if (typeof obj !== 'object' && typeof obj !== 'function') {
        return;
    }
    let re = new RegExp('^' + name + '$', 'ig');
    let functionName = _.find(getOwnPropertyNames(obj), function(x) {
        return (typeof obj[x] === 'function') && (instanceOf(obj[x].functionDecorator, FunctionConfiguration)) && re.test(obj[x].functionDecorator.name);
    });
    if (functionName) {
        return obj[functionName];
    }
};


/**
 * @static
 * @param {*} obj
 * @returns Array.<Function>|*
 */
EdmMapping.getOwnFunctions = function(obj) {
    if (typeof obj !== 'object' && typeof obj !== 'function') {
        return;
    }
    return _.flatMap(_.filter(getOwnPropertyNames(obj), function(x) {
        return (typeof obj[x] === 'function') && (instanceOf(obj[x].functionDecorator, FunctionConfiguration));
    }),  function(x) {
        return obj[x].functionDecorator;
    });
};

/**
 * @static
 * @param {*} obj
 * @returns Array.<Function>|*
 */
EdmMapping.getOwnActions = function(obj) {
    if (typeof obj !== 'object' && typeof obj !== 'function') {
        return;
    }
    return _.flatMap(_.filter(getOwnPropertyNames(obj), function(x) {
        return (typeof obj[x] === 'function') && (instanceOf(obj[x].actionDecorator, ActionConfiguration));
    }),  function(x) {
        return obj[x].actionDecorator;
    });
};


//exports
module.exports = {
    EdmType,
    EdmMultiplicity,
    EntitySetKind,
    ProcedureConfiguration,
    ActionConfiguration,
    FunctionConfiguration,
    EntityTypeConfiguration,
    EntitySetConfiguration,
    SingletonConfiguration,
    ODataModelBuilder,
    ODataConventionModelBuilder,
    EdmMapping,
    defineDecorator
}

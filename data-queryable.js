// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
var async = require('async');
var {sprintf} = require('sprintf-js');
var _ = require('lodash');
var {TextUtils} = require('@themost/common');
var {DataMappingExtender} = require('./data-mapping-extensions');
var {DataAssociationMapping} = require('./types');
var {DataError, Args} = require('@themost/common');
var {QueryField, Expression, MethodCallExpression} = require('@themost/query');
var {QueryEntity} = require('@themost/query');
var {QueryUtils} = require('@themost/query');
var Q = require('q');
var {hasOwnProperty} = require('./has-own-property');
var { DataAttributeResolver } = require('./data-attribute-resolver');
var { DataExpandResolver } = require('./data-expand-resolver');
var {instanceOf} = require('./instance-of');
var { DataValueResolver } = require('./data-value-resolver');

/**
 * @param {DataQueryable} target 
 */
function resolveJoinMember(target) {
    return function onResolvingJoinMember(event) {
        /**
         * @type {Array}
         */
        var fullyQualifiedMember = event.fullyQualifiedMember.split('.');
        // validate first member
        const attribute = target.model.getAttribute(fullyQualifiedMember[0]);
        var expr = DataAttributeResolver.prototype.resolveNestedAttribute.call(target, fullyQualifiedMember.join('/'));
        if (attribute && attribute.type === 'Json') {
            Args.check(expr.$value != null, 'Invalid expression. Expected a JSON expression.');
            var [method] = Object.keys(expr.$value); // get method name
            var methodWithoutSign = method.replace(/\$/g, '');
            var { [method]: args } = expr.$value;
            Object.assign(event, {
                member: new MethodCallExpression(methodWithoutSign, args)
            });
            return;
        } 
        if (instanceOf(expr, QueryField)) {
            var member = expr.$name.split('.');
            Object.assign(event, {
                object: member[0],
                member: member[1]
            })
        }
        if (expr instanceof Expression) {
            Object.assign(event, {
                member: expr
            })
        }
    }
}

// eslint-disable-next-line no-unused-vars
function resolveZeroOrOneJoinMember(target) {
    /**
     * This method tries to resolve a join member e.g. product.productDimensions
     * when this member defines a zero-or-one association
     */
    return function onResolvingZeroOrOneJoinMember(event) {
        /**
         * @type {Array<string>}
         */
        // eslint-disable-next-line no-unused-vars
        var fullyQualifiedMember = event.fullyQualifiedMember.split('.');
    }
}

/**
 * @param {DataQueryable} target 
 */
function resolveMember(target) {
    /**
     * @param {member:string} event
     */
    return function onResolvingMember(event) {
        var collection = target.model.viewAdapter;
        var member = event.member.replace(new RegExp('^' + collection + '.'), '');
        /**
         * @type {import('./types').DataAssociationMapping}
         */
        var mapping = target.model.inferMapping(member);
        if (mapping == null) {
            return;
        }
        /**
         * @type {import('./types').DataField}
         */
        var attribute = target.model.getAttribute(member);
        if (attribute.multiplicity === 'ZeroOrOne') {
            var resolveMember = null;
            if (mapping.associationType === 'junction' && mapping.parentModel === self.name) {
                // expand child field
                resolveMember = attribute.name.concat('/', mapping.childField);
            } else if (mapping.associationType === 'junction' && mapping.childModel === self.name) {
                // expand parent field
                resolveMember = attribute.name.concat('/', mapping.parentField);
            } else if (mapping.associationType === 'association' && mapping.parentModel === target.model.name) {
                var associatedModel = target.model.context.model(mapping.childModel);
                resolveMember = attribute.name.concat('/', associatedModel.primaryKey);
            }
            if (resolveMember) {
                // resolve attribute
                var expr = DataAttributeResolver.prototype.resolveNestedAttribute.call(target, resolveMember);
                if (instanceOf(expr, QueryField)) {
                    event.member = expr.$name;
                }
            }
        }
        
    }
}

/**
 * @classdesc Represents a dynamic query helper for filtering, paging, grouping and sorting data associated with an instance of DataModel class.
 * @class
 * @property {DataModel|*} model - Gets or sets the underlying data model
 * @constructor
 * @param model {DataModel|*}
 * @augments DataContextEmitter
 */
function DataQueryable(model) {
    /**
     * @property DataQueryable#query
     * @type {import('@themost/query').QueryExpression}
     */
    /**
     * @type {QueryExpression}
     * @private
     */
    var q = null;
    /**
     * Gets or sets an array of expandable models
     * @type {Array}
     * @private
     */
    this.$expand = undefined;
    /**
     * @type {Boolean}
     * @private
     */
    this.$flatten = undefined;
    /**
     * @type {DataModel}
     * @private
     */
    var m = model;
    Object.defineProperty(this, 'query', { get: function() {
        if (!q) {
            if (!m) {
                return null;
            }
            q = QueryUtils.query(m.viewAdapter);
        }
        return q;
    }, configurable:false, enumerable:false});

    this.query

    Object.defineProperty(this, 'model', { get: function() {
        return m;
    }, configurable:false, enumerable:false});
    //get silent property
    if (m)
        this.silent(m.$silent);
}
/**
 * Clones the current DataQueryable instance.
 * @returns {DataQueryable|*} - The cloned object.
 */
DataQueryable.prototype.clone = function() {
    var result = new DataQueryable(this.model);
    //set view if any
    result.$view = this.$view;
    //set silent property
    result.$silent = this.$silent;
    //set silent property
    result.$levels = this.$levels;
    //set flatten property
    result.$flatten = this.$flatten;
    //set expand property
    result.$expand = this.$expand;
    //set query
    _.assign(result.query, this.query);
    return result;
};

/**
 * Ensures data queryable context and returns the current data context. This function may be overriden.
 * @returns {DataContext}
 * @ignore
 */
DataQueryable.prototype.ensureContext = function() {
    if (this.model!==null)
        if (this.model.context!==null)
            return this.model.context;
    return null;
};

/**
 * Serializes the underlying query and clears current filter expression for further filter processing. This operation may be used in complex filtering.
 * @param {Boolean=} useOr - Indicates whether an or statement will be used in the resulted statement.
 * @returns {DataQueryable}
 * @example
 //retrieve a list of order
 context.model('Order')
 .where('orderStatus').equal(1).and('paymentMethod').equal(2)
 .prepare().where('orderStatus').equal(2).and('paymentMethod').equal(2)
 .prepare(true)
 //(((OrderData.orderStatus=1) AND (OrderData.paymentMethod=2)) OR ((OrderData.orderStatus=2) AND (OrderData.paymentMethod=2)))
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.prepare = function(useOr) {
    this.query.prepare(useOr);
    return this;
};

/**
 * Initializes a where expression
 * @param attr {string|*} - A string which represents the field name that is going to be used as the left operand of this expression
 * @returns this
 */
DataQueryable.prototype.where = function(attr) {

    // get arguments as array
    var args = Array.from(arguments);
    if (typeof args[0] === 'function') {
        /**
         * @type {import("@themost/query").QueryExpression}
         */
        var query = this.query;
        var onResolvingJoinMember = resolveJoinMember(this);
        query.resolvingJoinMember.subscribe(onResolvingJoinMember);
        try {
            query.where.apply(query, args);
        } finally {
            query.resolvingJoinMember.unsubscribe(onResolvingJoinMember);
        }
        return this;
    }
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.where(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr));
        return this;
    }
    // check if attribute defines a many-to-many association
    var mapping = this.model.inferMapping(attr);
    if (mapping && mapping.associationType === 'junction') {
        // append mapping id e.g. groups -> groups/id or members -> members/id etc
        let attrId = attr + '/' + mapping.parentField;
        if (mapping.parentModel === this.model.name) {
            attrId = attr + '/' + mapping.childField;
        }
        this.query.where(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attrId));
        return this;
    }
    this.query.where(this.fieldOf(attr));
    return this;
};



/**
 * Initializes a full-text search expression
 * @param {string} text - A string which represents the text we want to search for
 * @returns {DataQueryable}
 * @example
 context.model('Person')
 .search('Peter')
 .select('description')
 .take(25).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.search = function(text) {
    var self = this;
// eslint-disable-next-line no-unused-vars
    var options = { multiword:true };
    var terms = [];
    if (typeof text !== 'string') { return self; }
    var re = /("(.*?)")|([^\s]+)/g;
    var match = re.exec(text);
    while(match) {
        if (match[2]) {
            terms.push(match[2]);
        }
        else {
            terms.push(match[0]);
        }
        match = re.exec(text);
    }
    if (terms.length===0) {
        return self;
    }
    self.prepare();
    var stringTypes = [ 'Text', 'URL', 'Note' ];
    self.model.attributes.forEach(function(x) {
        if (x.many) { return; }
        var mapping = self.model.inferMapping(x.name);
        if (mapping) {
            if ((mapping.associationType === 'association') && (mapping.childModel===self.model.name)) {
                var parentModel = self.model.context.model(mapping.parentModel);
                if (parentModel) {
                    parentModel.attributes.forEach(function(z) {
                        if (stringTypes.indexOf(z.type)>=0) {
                            terms.forEach(function (w) {
                                if (!/^\s+$/.test(w))
                                    self.or(x.name + '/' + z.name).contains(w);
                            });
                        }
                    });
                }
            }
        }
        if (stringTypes.indexOf(x.type)>=0) {
            terms.forEach(function (y) {
                if (!/^\s+$/.test(y))
                    self.or(x.name).contains(y);
            });
        }
    });
    self.prepare();
    return self;
};

DataQueryable.prototype.join = function(model)
{
    var self = this;
    if (_.isNil(model))
        return this;
    /**
     * @type {DataModel}
     */
    var joinModel = self.model.context.model(model);
    //validate joined model
    if (_.isNil(joinModel))
        throw new Error(sprintf('The %s model cannot be found', model));
    var arr = self.model.attributes.filter(function(x) { return x.type===joinModel.name; });
    if (arr.length===0)
        throw new Error(sprintf('An internal error occurred. The association between %s and %s cannot be found', this.model.name ,model));
    var mapping = self.model.inferMapping(arr[0].name);
    var expr = QueryUtils.query();
    expr.where(self.fieldOf(mapping.childField)).equal(joinModel.fieldOf(mapping.parentField));
    /**
     * @type DataAssociationMapping
     */
    var entity = new QueryEntity(joinModel.viewAdapter).left();
    //set join entity (without alias and join type)
    self.select().query.join(entity).with(expr);
    return self;
};

/**
 * Prepares a logical AND expression
 * @param attr {string} - The name of field that is going to be used in this expression
 * @returns {DataQueryable}
 * @example
 context.model('Order').where('customer').equal(298)
 .and('orderStatus').equal(1)
 .list().then(function(result) {
        //SQL: WHERE ((OrderData.customer=298) AND (OrderData.orderStatus=1)
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.and = function(attr) {
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.and(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr));
        return this;
    }
    // check if attribute defines a many-to-many association
    var mapping = this.model.inferMapping(attr);
    if (mapping && mapping.associationType === 'junction') {
        // append mapping id e.g. groups -> groups/id or members -> members/id etc
        let attrId = attr + '/' + mapping.parentField;
        if (mapping.parentModel === this.model.name) {
            attrId = attr + '/' + mapping.childField;
        }
        this.query.where(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attrId));
        return this;
    }
    this.query.and(this.fieldOf(attr));
    return this;
};
/**
 * Prepares a logical OR expression
 * @param attr {string} - The name of field that is going to be used in this expression
 * @returns {DataQueryable}
 * @example
 //((OrderData.orderStatus=1) OR (OrderData.orderStatus=2)
 context.model('Order').where('orderStatus').equal(1)
 .or('orderStatus').equal(2)
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.or = function(attr) {
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.or(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr));
        return this;
    }
    // check if attribute defines a many-to-many association
    var mapping = this.model.inferMapping(attr);
    if (mapping && mapping.associationType === 'junction') {
        // append mapping id e.g. groups -> groups/id or members -> members/id etc
        let attrId = attr + '/' + mapping.parentField;
        if (mapping.parentModel === this.model.name) {
            attrId = attr + '/' + mapping.childField;
        }
        this.query.where(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attrId));
        return this;
    }
    this.query.or(this.fieldOf(attr));
    return this;
};

/**
 * @private
 * @this DataQueryable
 * @memberof DataQueryable#
 * @param {*} obj
 * @returns {*}
 */
function resolveValue(obj) {
    var self = this;
    if (typeof obj === 'string' && /^\$it\//.test(obj)) {
        var attr = obj.replace(/^\$it\//,'');
        if (DataAttributeResolver.prototype.testNestedAttribute(attr)) {
            return DataAttributeResolver.prototype.resolveNestedAttribute.call(self, attr);
        }
        else {
            attr = DataAttributeResolver.prototype.testAttribute(attr);
            if (attr) {
                return self.fieldOf(attr.name);
            }
        }
    }
    return obj;
}

/**
 * Performs an equality comparison.
 * @param obj {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders with order status equal to 1
 context.model('Order').where('orderStatus').equal(1)
 .list().then(function(result) {
        //WHERE (OrderData.orderStatus=1)
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.equal = function(obj) {
    // check if the given object is an array
    if (Array.isArray(obj)) {
        var resolver = new DataValueResolver(this);
        // and resolve each value separately
        this.query.equal(obj.map(function(value) {
            return resolver.resolve(value);
        }));
        return this;
    }
    this.query.equal(new DataValueResolver(this).resolve(obj));
    return this;
};

/**
 * Performs an equality comparison.
 * @param obj {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve a person with id equal to 299
 context.model('Person').where('id').is(299)
 .first().then(function(result) {
        //WHERE (PersonData.id=299)
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.is = function(obj) {
    return this.equal(obj);
};
// noinspection JSUnusedGlobalSymbols
/**
 * Prepares a not equal comparison.
 * @param obj {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders with order status different than 1
 context.model('Order')
 .where('orderStatus').notEqual(1)
 .orderByDescending('orderDate')
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.notEqual = function(obj) {
    // check if the given object is an array
    if (Array.isArray(obj)) {
        var resolver = new DataValueResolver(this);
        // and resolve each value separately
        this.query.notEqual(obj.map(function(value) {
            return resolver.resolve(value);
        }));
        return this;
    }
    // otherwise resolve the value
    this.query.notEqual(new DataValueResolver(this).resolve(obj));
    return this;
};
// noinspection JSUnusedGlobalSymbols
/**
 * Prepares a greater than comparison.
 * @param obj {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders where product price is greater than 800
 context.model('Order')
 .where('orderedItem/price').greaterThan(800)
 .orderByDescending('orderDate')
 .select('id','orderedItem/name as productName', 'orderedItem/price as productPrice', 'orderDate')
 .take(5)
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 id   productName                                   productPrice  orderDate
 ---  --------------------------------------------  ------------  -----------------------------
 304  Apple iMac (27-Inch, 2013 Version)            1336.27       2015-11-27 23:49:17.000+02:00
 322  Dell B1163w Mono Laser Multifunction Printer  842.86        2015-11-27 20:16:52.000+02:00
 167  Razer Blade (2013)                            1553.43       2015-11-27 04:17:08.000+02:00
 336  Apple iMac (27-Inch, 2013 Version)            1336.27       2015-11-26 07:25:35.000+02:00
 89   Nvidia GeForce GTX 650 Ti Boost               1625.49       2015-11-21 17:29:21.000+02:00
 */
DataQueryable.prototype.greaterThan = function(obj) {
    this.query.greaterThan(new DataValueResolver(this).resolve(obj));
    return this;
};

/**
 * Prepares a greater than or equal comparison.
 * @param obj {*} The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders where product price is greater than or equal to 800
 context.model('Order')
 .where('orderedItem/price').greaterOrEqual(800)
 .orderByDescending('orderDate')
 .take(5)
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.greaterOrEqual = function(obj) {
    this.query.greaterOrEqual(new DataValueResolver(this).resolve(obj));
    return this;
};

/**
 * Prepares a bitwise and comparison.
 * @param {*} value - The right operand of the express
 * @param {Number=} result - The result of a bitwise and expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of permissions for model Person and insert permission mask (2)
 context.model('Permission')
 //prepare bitwise AND (((PermissionData.mask & 2)=2)
 .where('mask').bit(2)
 .and('privilege').equal('Person')
 .and('parentPrivilege').equal(null)
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 *
 */
DataQueryable.prototype.bit = function(value, result) {
    if (_.isNil(result))
        this.query.bit(value, value);
    else
        this.query.bit(value, result);
    return this;
};

/**
 * Prepares a lower than comparison
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.lowerThan = function(obj) {
    this.query.lowerThan(new DataValueResolver(this).resolve(obj));
    return this;
};

/**
 * Prepares a lower than or equal comparison.
 * @param obj {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve orders based on payment due date
 context.model('Order')
 .orderBy('paymentDue')
 .where('paymentDue').lowerOrEqual(moment().subtract('days',-7).toDate())
 .and('paymentDue').greaterThan(new Date())
 .take(10).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.lowerOrEqual = function(obj) {
    this.query.lowerOrEqual(new DataValueResolver(this).resolve(obj));
    return this;
};
// noinspection JSUnusedGlobalSymbols
/**
 * Prepares an ends with comparison
 * @param obj {*} - The string to be searched for at the end of a field.
 * @returns {DataQueryable}
 * @example
 //retrieve people whose given name starts with 'D'
 context.model('Person')
 .where('givenName').startsWith('D')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 id   givenName  familyName
 ---  ---------  ----------
 257  Daisy      Lambert
 275  Dustin     Brooks
 333  Dakota     Gallagher
 */
DataQueryable.prototype.startsWith = function(obj) {
    this.query.startsWith(obj);
    return this;
};
// noinspection JSUnusedGlobalSymbols
/**
 * Prepares an ends with comparison
 * @param obj {*} - The string to be searched for at the end of a field.
 * @returns {DataQueryable}
 * @example
 //retrieve people whose given name ends with 'y'
 context.model('Person')
 .where('givenName').endsWith('y')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results
 id   givenName  familyName
 ---  ---------  ----------
 257  Daisy      Lambert
 287  Zachary    Field
 295  Anthony    Berry
 339  Brittney   Hunt
 341  Kimberly   Wheeler
 */
DataQueryable.prototype.endsWith = function(obj) {
    this.query.endsWith(obj);
    return this;
};

/**
 * Prepares a typical IN comparison.
 * @param objs {Array} - An array of values which represents the values to be used in expression
 * @returns {DataQueryable}
 * @example
 //retrieve orders with order status 1 or 2
 context.model('Order').where('orderStatus').in([1,2])
 .list().then(function(result) {
        //WHERE (OrderData.orderStatus IN (1, 2))
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.in = function(objs) {
    this.query.in(objs);
    return this;
};

/**
 * Prepares a typical NOT IN comparison.
 * @param objs {Array} - An array of values which represents the values to be used in expression
 * @returns {DataQueryable}
 * @example
 //retrieve orders with order status 1 or 2
 context.model('Order').where('orderStatus').notIn([1,2])
 .list().then(function(result) {
        //WHERE (NOT OrderData.orderStatus IN (1, 2))
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.notIn = function(objs) {
    this.query.notIn(objs);
    return this;
};

/**
 * Prepares a modular arithmetic operation
 * @param {*} obj The value to be compared
 * @param {Number} result The result of modular expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.mod = function(obj, result) {
    this.query.mod(obj, result);
    return this;
};

/**
 * Prepares a contains comparison (e.g. a string contains another string).
 * @param value {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve person where the given name contains
 context.model('Person').select(['id','givenName','familyName'])
 .where('givenName').contains('ex')
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //The result set of this example may be:
 id   givenName  familyName
 ---  ---------  ----------
 297  Alex       Miles
 353  Alexis     Rees
 */
DataQueryable.prototype.contains = function(value) {
    this.query.contains(value);
    return this;
};

/**
 * Prepares a not contains comparison (e.g. a string contains another string).
 * @param value {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve persons where the given name not contains 'ar'
 context.model('Person').select(['id','givenName','familyName'])
 .where('givenName').notContains('ar')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //The result set of this example may be:
 id   givenName  familyName
 ---  ---------  ----------
 257  Daisy      Lambert
 259  Peter      French
 261  Kylie      Jordan
 263  Maxwell    Hall
 265  Christian  Marshall
 */
DataQueryable.prototype.notContains = function(value) {
    this.query.notContains(value);
    return this;
};

/**
 * Prepares a comparison where the left operand is between two values
 * @param {*} value1 - The minimum value
 * @param {*} value2 - The maximum value
 * @returns {DataQueryable}
 * @example
 //retrieve products where price is between 150 and 250
 context.model('Product')
 .where('price').between(150,250)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //The result set of this example may be:
 id   name                                        model   price
 ---  ------------------------------------------  ------  ------
 367  Asus Transformer Book T100                  HD2895  224.52
 380  Zotac Zbox Nano XS AD13 Plus                WC5547  228.05
 384  Apple iPad Air                              ZE6015  177.44
 401  Intel Core i7-4960X Extreme Edition         SM5853  194.61
 440  Bose SoundLink Bluetooth Mobile Speaker II  HS5288  155.27
 */
DataQueryable.prototype.between = function(value1, value2) {
    const resolver = new DataValueResolver(this);
    this.query.between(resolver.resolve(value1), resolver.resolve(value2));
    return this;
};

/**
 * @this DataQueryable
 * @memberOf DataQueryable#
 * @param arg
 * @returns {*}
 * @private
 */
function select_(arg) {
    var self = this;
    if (typeof arg === 'string' && arg.length===0) {
        return;
    }
    var a = DataAttributeResolver.prototype.testAggregatedNestedAttribute.call(self,arg);
    if (a) {
        return DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, a.aggr , a.name, a.property);
    }
    else {
        a = DataAttributeResolver.prototype.testNestedAttribute.call(self,arg);
        if (a) {
            return DataAttributeResolver.prototype.selectNestedAttribute.call(self, a.name, a.property);
        }
        else {
            a = DataAttributeResolver.prototype.testAttribute.call(self,arg);
            if (a) {
                return self.fieldOf(a.name, a.property);
            }
            else {
                return self.fieldOf(arg);
            }
        }
    }
}

/**
 * Selects a field or a collection of fields of the current model.
 * @param {...*} attr  An array of fields, a field or a view name
 * @returns {DataQueryable}
 */
DataQueryable.prototype.select = function(attr) {

    var self = this;
    var arr;
    var expr;
    var arg = (arguments.length>1) ? Array.prototype.slice.call(arguments): attr;
    // get arguments as array
    var args = Array.from(arguments);
    if (typeof args[0] === 'function') {
        /**
         * @type {import("@themost/query").QueryExpression}
         */
        var query = this.query;
        var onResolvingJoinMember = resolveJoinMember(this);
        query.resolvingJoinMember.subscribe(onResolvingJoinMember);
        var onResolvingMember = resolveMember(this);
        query.resolvingMember.subscribe(onResolvingMember);
        try {
            query.select.apply(query, args);
        } finally {
            query.resolvingJoinMember.unsubscribe(onResolvingJoinMember);
            query.resolvingMember.unsubscribe(onResolvingMember);
        }
        return this;
    }

    if (typeof arg === 'string') {
        if (arg==='*') {
            //delete select
            delete self.query.$select;
            return this;
        }
        //validate field or model view
        var field = self.model.field(arg);
        if (field) {
            //validate field
            if (field.many || (field.mapping && field.mapping.associationType === 'junction')) {
                self.expand(field.name);
            }
            else {
                arr = [];
                arr.push(self.fieldOf(field.name));
            }
        }
        else {
            //get data view
            self.$view  = self.model.dataviews(arg);
            //if data view was found
            if (self.$view) {
                arr = [];
                var name;
                self.$view.fields.forEach(function(x) {
                    name = x.name;
                    field = self.model.field(name);
                    //if a field with the given name exists in target model
                    if (field) {
                        //check if this field has an association mapping
                        if (field.many || (field.mapping && field.mapping.associationType === 'junction'))
                            self.expand(field.name);
                        else
                            arr.push(self.fieldOf(field.name, x.property));
                    }
                    else {
                        var b = DataAttributeResolver.prototype.testAggregatedNestedAttribute.call(self,name);
                        if (b) {
                            expr = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, b.aggr , b.name);
                            if (expr) { arr.push(expr); }
                        }
                        else {
                            b = DataAttributeResolver.prototype.testNestedAttribute.call(self,name);
                            if (b) {
                                expr = DataAttributeResolver.prototype.selectNestedAttribute.call(self, b.name, x.property);
                                if (expr) { arr.push(expr); }
                            }
                            else {
                                b = DataAttributeResolver.prototype.testAttribute.call(self,name);
                                if (b) {
                                    arr.push(self.fieldOf(b.name, x.property));
                                }
                                else if (/\./g.test(name)) {
                                    name = name.split('.')[0];
                                    arr.push(self.fieldOf(name));
                                }
                                else
                                {
                                    arr.push(self.fieldOf(name));
                                }
                            }
                        }
                    }
                });
            }
            //select a field from a joined entity
            else {
                expr = select_.call(self, arg);
                if (expr) {
                    arr = arr || [];
                    arr.push(expr);
                }
            }
        }
        if (_.isArray(arr)) {
            if (arr.length===0)
                arr = null;
        }
    }
    else {
        //get array of attributes
        if (_.isArray(arg)) {
            arr = [];
            //check if field is a data view
            if (arg.length === 1 && typeof arg[0] === 'string') {
                if (self.model.dataviews(arg[0])) {
                    return self.select(arg[0]);
                }
            }
            arg.forEach(function(x) {
                if (typeof x === 'string') {
                    field = self.model.field(x);
                    if (field) {
                        if (field.many || (field.mapping && field.mapping.associationType === 'junction')) {
                            self.expand({
                                'name':field.name,
                                'options':field.options
                            });
                        }
                        else {
                            arr.push(self.fieldOf(field.name));
                        }
                    }
                    //test nested attribute and simple attribute expression
                    else {
                        expr = select_.call(self, x);
                        if (expr) {
                            arr = arr || [];
                            arr.push(expr);
                        }
                    }
                }
                else {
                    //validate if x is an object (QueryField)
                    arr.push(x);
                }

            });
        }
    }
    if (_.isNil(arr)) {
        if (!self.query.hasFields()) {
            // //enumerate fields
            var fields = self.model.attributes.filter(function (x) {
                return (x.many === false) || (_.isNil(x.many)) || ((x.expandable === true) && (self.getLevels()>0));
            }).map(function(x) {
                return x.property || x.name;
            });
            if (fields.length === 0) {
                return this;
            }
            return self.select.apply(self, fields);
        }
    }
    else {
        self.query.select(arr);
    }

    return this;
};
// noinspection JSUnusedGlobalSymbols
DataQueryable.prototype.dateOf = function(attr) {
    if (typeof attr ==='undefined' || attr === null)
        return attr;
    if (typeof attr !=='string')
        return attr;
    return this.fieldOf('date(' + attr + ')');
};

/**
 * @param attr {string|*}
 * @param alias {string=}
 * @returns {DataQueryable|QueryField|*}
 */
DataQueryable.prototype.fieldOf = function(attr, alias) {

    if (typeof attr ==='undefined' || attr === null)
        return attr;
    if (typeof attr !=='string')
        return attr;
    var matches = /(count|avg|sum|min|max)\((.*?)\)/i.exec(attr), res, field, aggr, prop;
    if (matches) {
        //get field
        field = this.model.field(matches[2]);
        //get aggregate function
        aggr = matches[1].toLowerCase();
        //test nested attribute aggregation
        if (_.isNil(field) && /\//.test(matches[2])) {
            //resolve nested attribute
            var nestedAttr = DataAttributeResolver.prototype.resolveNestedAttribute.call(this, matches[2]);
            //if nested attribute exists
            if (nestedAttr) {
                if (_.isNil(alias)) {
                    var nestedMatches = /as\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(attr);
                    alias = _.isNil(nestedMatches) ? aggr.concat('Of_', matches[2].replace(/\//g, '_')) : nestedMatches[1];
                }
                /**
                 * @type {Function}
                 */
                var fn = QueryField[aggr];
                //return query field
                return fn(nestedAttr.$name).as(alias);
            }
        }
        if (typeof  field === 'undefined' || field === null)
            throw new Error(sprintf('The specified field %s cannot be found in target model.', matches[2]));
        if (_.isNil(alias)) {
            matches = /as\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(attr);
            if (matches) {
                alias = matches[1];
            }
            else {
                alias = aggr.concat('Of', field.name);
            }
        }
        if (aggr==='count')
            return QueryField.count(field.name).from(this.model.viewAdapter).as(alias);
        else if (aggr==='avg')
            return QueryField.average(field.name).from(this.model.viewAdapter).as(alias);
        else if (aggr==='sum')
            return QueryField.sum(field.name).from(this.model.viewAdapter).as(alias);
        else if (aggr==='min')
            return QueryField.min(field.name).from(this.model.viewAdapter).as(alias);
        else if (aggr==='max')
            return QueryField.max(field.name).from(this.model.viewAdapter).as(alias);
    }
    else {
        matches = /(\w+)\((.*?)\)/i.exec(attr);
        if (matches) {
            res = { };
            field = this.model.field(matches[2]);
            aggr = matches[1];
            if (typeof  field === 'undefined' || field === null)
                throw new Error(sprintf('The specified field %s cannot be found in target model.', matches[2]));
            if (_.isNil(alias)) {
                matches = /as\s([\u0021-\u007F\u0080-\uFFFF]+)$/i.exec(attr);
                if (matches) {
                    alias = matches[1];
                }
            }
            prop = alias || field.property || field.name;
            res[prop] = { }; res[prop]['$' + aggr] = [ QueryField.select(field.name).from(this.model.viewAdapter) ];
            return res;
        }
        else {
            //matches expression [field] as [alias] e.g. itemType as type
            matches = /^(\w+)\s+as\s+(.*?)$/i.exec(attr);
            if (matches) {
                field = this.model.field(matches[1]);
                if (typeof  field === 'undefined' || field === null)
                    throw new Error(sprintf('The specified field %s cannot be found in target model.', attr));
                alias = matches[2];
                prop = alias || field.property || field.name;
                return QueryField.select(field.name).from(this.model.viewAdapter).as(prop);
            }
            else {
                //try to match field with expression [field] as [alias] or [nested]/[field] as [alias]
                field = this.model.field(attr);
                if (typeof  field === 'undefined' || field === null)
                    throw new Error(sprintf('The specified field %s cannot be found in target model.', attr));
                var f = QueryField.select(field.name).from(this.model.viewAdapter);
                if (alias) {
                    return f.as(alias);
                }
                else if (field.property) {
                    return f.as(field.property);
                }
                return f;
            }
        }
    }
    return this;
};

/**
 * Prepares an ascending sorting operation
 * @param {string|*} attr - The field name to use for sorting results
 * @returns {DataQueryable}
 */
DataQueryable.prototype.orderBy = function(attr) {

    var args = Array.from(arguments);
    if (typeof args[0] === 'function') {
        /**
         * @type {import("@themost/query").QueryExpression}
         */
        var query = this.query;
        var onResolvingJoinMember = resolveJoinMember(this);
        query.resolvingJoinMember.subscribe(onResolvingJoinMember);
        try {
            query.orderBy.apply(query, args);
        } finally {
            query.resolvingJoinMember.unsubscribe(onResolvingJoinMember);
        }
        return this;
    }

    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.orderBy(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
        return this;
    }
    this.query.orderBy(this.fieldOf(attr));
    return this;
};

/**
 * Prepares a group by expression
 * @param {...*} attr - A param array of string that represents the attributes which are going to be used in group by expression
 * @returns {DataQueryable}

 */
DataQueryable.prototype.groupBy = function(attr) {
    var arr = [],
        arg = (arguments.length>1) ? Array.prototype.slice.call(arguments): attr;
    var args = Array.from(arguments);
    if (typeof args[0] === 'function') {
        /**
         * @type {import("@themost/query").QueryExpression}
         */
        var query = this.query;
        var onResolvingJoinMember = resolveJoinMember(this);
        query.resolvingJoinMember.subscribe(onResolvingJoinMember);
        try {
            query.groupBy.apply(query, args);
        } finally {
            query.resolvingJoinMember.unsubscribe(onResolvingJoinMember);
        }
        return this;
    }
    if (_.isArray(arg)) {
        for (var i = 0; i < arg.length; i++) {
            var x = arg[i];
            if (DataAttributeResolver.prototype.testNestedAttribute.call(this,x)) {
                //nested group by
                arr.push(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, x));
            }
            else {
                arr.push(this.fieldOf(x));
            }
        }
    }
    else {
        if (DataAttributeResolver.prototype.testNestedAttribute.call(this,arg)) {
            //nested group by
            arr.push(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, arg));
        }
        else {
            arr.push(this.fieldOf(arg));
        }
    }
    if (arr.length>0) {
        this.query.groupBy(arr);
    }
    return this;
};

/**
 * Continues a ascending sorting operation
 * @param {string|*} attr - The field to use for sorting results
 * @returns {DataQueryable}
 */
DataQueryable.prototype.thenBy = function(attr) {
    var args = Array.from(arguments);
    if (typeof args[0] === 'function') {
        /**
         * @type {import("@themost/query").QueryExpression}
         */
        var query = this.query;
        var onResolvingJoinMember = resolveJoinMember(this);
        query.resolvingJoinMember.subscribe(onResolvingJoinMember);
        try {
            query.thenBy.apply(query, args);
        } finally {
            query.resolvingJoinMember.unsubscribe(onResolvingJoinMember);
        }
        return this;
    }
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.thenBy(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
        return this;
    }
    this.query.thenBy(this.fieldOf(attr));
    return this;
};

/**
 * Prepares a descending sorting operation
 * @param {string|*} attr - The field name to use for sorting results
 * @returns {DataQueryable}
 */
DataQueryable.prototype.orderByDescending = function(attr) {
    var args = Array.from(arguments);
    if (typeof args[0] === 'function') {
        /**
         * @type {import("@themost/query").QueryExpression}
         */
        var query = this.query;
        var onResolvingJoinMember = resolveJoinMember(this);
        query.resolvingJoinMember.subscribe(onResolvingJoinMember);
        try {
            query.orderByDescending.apply(query, args);
        } finally {
            query.resolvingJoinMember.unsubscribe(onResolvingJoinMember);
        }
        return this;
    }
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.orderByDescending(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
        return this;
    }
    this.query.orderByDescending(this.fieldOf(attr));
    return this;
};

/**
 * Continues a descending sorting operation
 * @param {string|*} attr The field name to use for sorting results
 * @returns {DataQueryable}
 */
DataQueryable.prototype.thenByDescending = function(attr) {
    var args = Array.from(arguments);
    if (typeof args[0] === 'function') {
        /**
         * @type {import("@themost/query").QueryExpression}
         */
        var query = this.query;
        var onResolvingJoinMember = resolveJoinMember(this);
        query.resolvingJoinMember.subscribe(onResolvingJoinMember);
        try {
            query.thenByDescending.apply(query, args);
        } finally {
            query.resolvingJoinMember.unsubscribe(onResolvingJoinMember);
        }
        return this;
    }
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.thenByDescending(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
        return this;
    }
    this.query.thenByDescending(this.fieldOf(attr));
    return this;
};

/**
 * Executes the specified query against the underlying model and returns the first item.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result.
 * @returns {Promise|*}
 * @example
 //retrieve an order by id
 context.model('Order')
 .where('id').equal(302)
 .first().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.first = function(callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        firstInternal.call(this, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return firstInternal.call(this, callback);
    }
};
/**
 * @this DataQueryable
 * @private
 * @memberOf DataQueryable#
 * @param {Function} callback
 */
function firstInternal(callback) {
    var self = this;
    callback = callback || function() {};
    self.skip(0).take(1, function(err, result) {
        if (err) {
            callback(err);
        }
        else {
            if (result.length>0)
                callback(null, result[0]);
            else
                callback(null);
        }
    });
}


/**
 * Executes the specified query and returns all objects which satisfy the specified criteria.
 * @param {Function=} callback
 * @returns {Promise|*}
 */
DataQueryable.prototype.all = function(callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        allInternal.call(this, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        allInternal.call(this, callback);
    }
};

/**
 * @this DataQueryable
 * @private
 * @memberOf DataQueryable#
 * @param {Function} callback
 */
function allInternal(callback) {
    var self = this;
    //remove skip and take
    delete this.query.$skip;
    delete this.query.$take;
    //validate already selected fields
    if (!self.query.hasFields()) {
        self.select();
    }
    callback = callback || function() {};
    //execute select
    execute_.call(self, callback);
}

/**
 * Prepares a paging operation by skipping the specified number of records
 * @param n {number} - The number of records to be skipped
 * @returns {DataQueryable}
 * @example
 //retrieve a list of products
 context.model('Product')
 .skip(10)
 .take(10)
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.skip = function(n) {
    this.query.$skip = n;
    return this;
};

/**
 * @this DataQueryable
 * @memberOf DataQueryable#
 * @private
 * @param {Number} n - Defines the number of items to take
 * @param {Function} callback
 * @returns {*} - A collection of objects that meet the query provided
 */
function takeInternal(n, callback) {
    var self = this;
    self.query.take(n);
    callback = callback || function() {};
    //validate already selected fields
    if (!self.query.hasFields()) {
        self.select();
    }
    //execute select
    execute_.call(self,callback);
}

/**
 * Prepares a data paging operation by taking the specified number of records
 * @param {Number} n - The number of records to take
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result.
 * @returns {DataQueryable|*} - If callback function is missing returns a promise.
 */
DataQueryable.prototype.take = function(n, callback) {
    if (typeof callback !== 'function') {
        this.query.take(n);
        return this;
    }
    else {
        takeInternal.call(this, n, callback);
    }
};
/**
 * Executes current query and returns a result set based on the specified paging parameters.
 * <p>
 *     The result is an instance of <a href="DataResultSet.html">DataResultSet</a>. The returned records may contain nested objects
 *     based on the definition of the current model (expandable fields).
 *     This operation is one of the common data operations on MOST Data Applications
 *     where the affected records may have nested objects which contain the associated objects of each object.
 * </p>
 <pre class="prettyprint"><code>
 {
    "total": 242,
    "records": [
        ...
        {
            "id": 46,
            "orderDate": "2014-12-31 13:35:41.000+02:00",
            "orderedItem": {
                "id": 413,
                "additionalType": "Product",
                "category": "Storage and Networking Gear",
                "price": 647.13,
                "model": "FY8135",
                "releaseDate": "2015-01-15 18:07:42.000+02:00",
                "name": "LaCie Blade Runner",
                "dateCreated": "2015-11-23 14:53:04.927+02:00",
                "dateModified": "2015-11-23 14:53:04.934+02:00"
            },
            "orderNumber": "DEF193",
            "orderStatus": {
                "id": 7,
                "name": "Problem",
                "alternateName": "OrderProblem",
                "description": "Representing that there is a problem with the order."
            },
            "paymentDue": "2015-01-20 13:35:41.000+02:00",
            "paymentMethod": {
                "id": 7,
                "name": "PayPal",
                "alternateName": "PayPal",
                "description": "Payment via the PayPal payment service."
            },
            "additionalType": "Order",
            "description": null,
            "dateCreated": "2015-11-23 21:00:18.306+02:00",
            "dateModified": "2015-11-23 21:00:18.307+02:00"
        }
        ...
    ]
}
 </code></pre>
 * @param {function(Error=,DataResultSet=)=} callback - A callback function with arguments (err, result) where the first argument is the error, if any
 * and the second argument is an object that represents a result set
 * @returns {Promise|*} - If callback is missing returns a promise.
 @example
 //retrieve products list order by price
 context.model('Product')
 .where('category').equal('LCDs and Peripherals')
 .orderByDescending('price')
 .take(3).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.list = function(callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        listInternal.call(this, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return listInternal.call(this, callback);
    }
};

/**
 * Executes current query and returns a result set based on the specified paging parameters.
 * @returns {Promise|*}
 */
DataQueryable.prototype.getList = function() {
    return this.list();
};

/**
 * Executes the specified query and returns an array of objects which satisfy the specified criteria.
 * @returns {Promise|*}
 */
DataQueryable.prototype.getItems = function() {
    var self = this, d = Q.defer();
    process.nextTick(function() {
        delete self.query.$inlinecount;
        if ((parseInt(self.query.$take, 10) || 0) < 0) {
            delete self.query.$take;
            delete self.query.$skip;
        }
        if (!self.query.hasFields()) {
            self.select();
        }
        execute_.call(self,function(err, result) {
            if (err) {
                return d.reject(err);
            }
            return d.resolve(result);
        });
    });
    return d.promise;
};

/**
 * @private
 * @this DataQueryable
 * @memberOf DataQueryable#
 * @param {Function} callback
 */
function listInternal(callback) {
    var self = this;
    try {
        callback = callback || function() {};
        //ensure take attribute
        var take = self.query.$take || 25;
        //ensure that fields are already selected (or select all)
        self.select();

        //take objects
        self.take(take, function(err, result)
        {
            if (err) {
                callback(err);
            }
            else {
                /**
                 * @type {DataQueryable|*}
                 */
                var q1 = self.clone();
                // get count of records
                q1.count(function(err, total) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        //and finally create result set
                        var res = { total: total, skip: parseInt(self.query.$skip, 10) || 0 , value: (result || []) };
                        callback(null, res);
                    }
                });
            }
        });
    }
    catch(e) {
        callback(e);
    }
}

/**
 * @param {string} name
 * @param {string=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.countOf = function(name, alias) {
    alias = alias || 'countOf'.concat(name);
    var res = this.fieldOf(sprintf('count(%s)', name));
    if (typeof alias !== 'undefined' && alias!==null)
        res.as(alias);
    return res;
};

/**
 * @param {string} name
 * @param {string=} alias
 * @returns {QueryField|*}
 */
DataQueryable.prototype.sumOf = function(name, alias) {
    alias = alias || 'sumOf'.concat(name);
    var res = this.fieldOf(sprintf('sum(%s)', name));
    if (typeof alias !== 'undefined' && alias!==null)
        res.as(alias);
    return res;
};

/**
 * @this DataQueryable
 * @private
 * @param callback {Function}
 * @returns {*} - A collection of objects that meet the query provided
 */
function countInternal(callback) {
    var self = this;
    callback = callback || function() {};
    //clone query
    var cloned = self.clone();
    cloned.query.count('__count__');
    if (cloned.query.hasFields() === false) {
        cloned.select();
    }
    if (hasOwnProperty(cloned.query, '$order')) {
        delete cloned.query.$order;
    }
    return  execute_.bind(cloned)(function(err, result) {
        if (err) {
            return callback(err);
        }
        var value = null;
        if (_.isArray(result)) {
            //get first value
            if (result.length>0)
                value = result[0]['__count__'];
        }
        return callback(null, value);
    });
}

/**
 * Executes the query against the current model and returns the count of items found.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result, if any.
 * @returns {Promise|*} - If callback parameter is missing then returns a Deferred object.
 * @example
 //retrieve the number of a product's orders
 context.model('Order')
 .where('orderedItem').equal(302)
 .count().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.count = function(callback) {
    var self = this;
    if (typeof callback !== 'function') {
        return Q.promise(function(resolve, reject) {
            countInternal.bind(self)(function(err, result) {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        });
    }
    else {
        return countInternal.bind(self)(callback);
    }
};

/**
 * @this DataQueryable
 * @private
 * @memberOf DataQueryable#
 * @param {string} attr
 * @param {Function} callback
 */
function maxInternal(attr, callback) {
    var self = this;
    delete self.query.$skip;
    var field = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, 'max', attr);
    self.select([field]).flatten().value(function(err, result) {
        if (err) { return callback(err); }
        callback(null, result)
    });
}

/**
 * Executes the query against the current model and returns the maximum value of the given attribute.
 * @param {string} attr - A string that represents a field of the current model
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result, if any.
 * @returns {Promise|*} - If callback parameter is missing then returns a Deferred object.
 * @example
 //retrieve the maximum price of products sold during last month
 context.model('Order')
 .where('orderDate').greaterOrEqual(moment().startOf('month').toDate())
 .max('orderedItem/price').then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.max = function(attr, callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        maxInternal.call(this, attr, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return maxInternal.call(this, attr, callback);
    }
};

/**
 * @this DataQueryable
 * @private
 * @memberOf DataQueryable#
 * @param {string} attr
 * @param {Function} callback
 */
function minInternal(attr, callback) {
    var self = this;
    delete self.query.$skip;
    var field = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, 'min', attr);
    self.select([field]).flatten().value(function(err, result) {
        if (err) { return callback(err); }
        callback(null, result)
    });
}

/**
 * Executes the query against the current model and returns the average value of the given attribute.
 * @param {string} attr - A string that represents a field of the current model
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result, if any.
 * @returns {Promise|*} - If callback parameter is missing then returns a Deferred object.
 * @example
 //retrieve the minimum price of products sold during last month
 context.model('Order')
 .where('orderDate').greaterOrEqual(moment().startOf('month').toDate())
 .min('orderedItem/price').then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.min = function(attr, callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        minInternal.call(this, attr, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return minInternal.call(this, attr, callback);
    }
};

/**
 * @private
 * @this DataQueryable
 * @memberOf DataQueryable#
 * @param {string} attr
 * @param {Function} callback
 */
function averageInternal_(attr, callback) {
    var self = this;
    delete self.query.$skip;
    var field = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, 'avg', attr);
    self.select([field]).flatten().value(function(err, result) {
        if (err) { return callback(err); }
        callback(null, result)
    });
}

/**
 * Executes the query against the current model and returns the average value of the given attribute.
 * @param {string} attr - A string that represents a field of the current model
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result, if any.
 * @returns {Deferred|*} - If callback parameter is missing then returns a Deferred object.
 * @example
 //retrieve the average price of products sold during last month
 context.model('Order')
 .where('orderDate').greaterOrEqual(moment().startOf('month').toDate())
 .average('orderedItem/price').then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.average = function(attr, callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        averageInternal_.call(this, attr, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return averageInternal_.call(this, attr, callback);
    }
};
/**
 * Migrates the underlying data model
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
 */
DataQueryable.prototype.migrate = function(callback) {
    var self = this;
    try {
        //ensure context
        self.ensureContext();
        if (self.model) {
            self.model.migrate(function(err) {
                callback(err);
            })
        }
        else {
            callback();
        }
    }
    catch (e) {
        callback(e);
    }

};
// noinspection JSUnusedGlobalSymbols
DataQueryable.prototype.postExecute = function(result, callback) {
    callback();
};

/**
 * Executes the underlying query statement.
 * @this DataQueryable
 * @param {Function} callback
 * @private
 */
 function execute_(callback) {
    var self = this;
    self.migrate(function(err) {
        if (err) { callback(err); return; }
        try {
            var event = { model:self.model, query:self.query, type:'select' };
            var flatten = self.$flatten || (self.getLevels()===0);
            if (!flatten) {
                //get expandable fields
                var expandables = self.model.attributes.filter(function(x) { return x.expandable; });
                //get selected fields
                var selected = self.query.$select[self.model.viewAdapter];
                if (_.isArray(selected)) {
                    //remove hidden fields
                    var hiddens = self.model.attributes.filter(function(x) { return x.hidden; });
                    if (hiddens.length>0) {
                        for (var i = 0; i < selected.length; i++) {
                            /**
                             * @type {QueryField}
                             */
                            var x = selected[i] instanceof QueryField ? selected[i] : new QueryField(selected[i]);
                            var hiddenField = hiddens.find(function(y) {
                                return x.getName() === y.name;
                            });
                            if (hiddenField) {
                                selected.splice(i, 1);
                                i-=1;
                            }
                        }
                    }
                    //expand fields
                    if (expandables.length>0) {
                        selected.forEach(function(x) {
                            //get field
                            var field = expandables.find(function(y) {
                                var f = x instanceof QueryField ? x : new QueryField(x);
                                return f.getName() === y.name;
                            });
                            //add expandable models
                            if (field) {
                                var mapping = self.model.inferMapping(field.name);
                                if (mapping) {
                                    self.$expand = self.$expand || [ ];
                                    var expand1 = self.$expand.find(function(x) {
                                        return x.name === field.name;
                                    });
                                    if (typeof expand1 === 'undefined') {
                                        self.expand(mapping);
                                    }
                                }

                            }
                        });
                    }
                }
            }
        }
        catch(err) {
            return callback(err);
        }

        //merge view filter. if any
        if (self.$view) {
            return self.model.filter({ $filter: self.$view.filter, $order:self.$view.order, $group:self.$view.group }, function(err, q) {
                if (err) {
                    if (err) { callback(err); }
                }
                else {
                    //prepare current filter
                    if (q.query.$prepared) {
                        if (event.query.$where)
                            event.query.prepare();
                        event.query.$where = q.query.$prepared;
                    }
                    if (q.query.$group)
                    //replace group fields
                        event.query.$group = q.query.$group;
                    //add order fields
                    if (q.query.$order) {
                        if (_.isArray(event.query.$order)) {
                            q.query.$order.forEach(function(x) { event.query.$order.push(x); });
                        }
                        else {
                            event.query.$order = q.query.$order;
                        }
                    }
                    //execute query
                    return finalExecuteInternal_.call(self, event, callback);
                }
            });
        }
        else {
            //execute query
            return finalExecuteInternal_.call(self, event, callback);
        }
    });
}

/**
 * @private
 * @this DataQueryable
 * @param {*} event
 * @param {Function} callback
 */
 function finalExecuteInternal_(event, callback) {
    var self = this, context = self.ensureContext();
    //pass data queryable to event
    event.emitter = this;
    var afterListenerCount = self.model.listeners('after.execute').length;
    self.model.emit('before.execute', event, function(err) {
        if (err) {
            callback(err);
        }
        else {
            //if command has been completed, do not execute the command against the underlying database
            if (typeof event['result'] !== 'undefined') {
                //call after execute
                var result = event['result'];
                return afterExecute_.call(self, result, function(err, result) {
                    if (err) { return callback(err); }
                    if (afterListenerCount===0) { return callback(null, result); }
                    //raise after execute event
                    self.model.emit('after.execute', event, function(err) {
                        if (err) { return callback(err); }
                        callback(null, result);
                    });
                });
            }
            context.db.execute(event.query, null, function(err, result) {
                if (err) { return callback(err); }
                afterExecute_.call(self, result, function(err, result) {
                    if (err) { return callback(err); }
                    if (afterListenerCount===0) { return callback(null, result); }
                    //raise after execute event
                    event.result = result;
                    self.model.emit('after.execute', event, function(err) {
                        if (err) { return callback(err); }
                        callback(null, result);
                    });
                });
            });
        }
    });
}

/**
 * @private
 * @this DataQueryable
 * @param {*} result
 * @param {Function} callback
 * @private
 */
function afterExecute_(result, callback) {
    var self = this;
    var field;
    if (self.query.$count) {
        return callback(null, result);
    }
    if (self.$expand) {
        //get distinct values
        var expands = _.intersectionBy(_.reverse(self.$expand), function(x) {
           if (typeof x === 'string') {
               return x;
           }
           else if (x instanceof DataAssociationMapping) {
                return x;
           }
           else if (typeof x.name === 'string') {
               return x.name;
           }
           return x;
        });

        //expands = self.$expand.distinct(function(x) { return x; });
        async.eachSeries(expands, function(expand, cb) {

            try {
                /**
                 * get mapping
                 * @type {DataAssociationMapping|*}
                 */
                var mapping = null, options = { };
                if (expand instanceof DataAssociationMapping) {
                    mapping = expand;
                    if (typeof expand.select !== 'undefined' && expand.select !== null) {
                        if (typeof expand.select === 'string')
                            options['$select'] = expand.select;
                        else if (_.isArray(expand.select))
                            options['$select'] = expand.select.join(',');
                    }
                    //get expand options
                    if (typeof expand.options !== 'undefined' && expand.options !== null) {
                        _.assign(options, expand.options);
                    }
                }
                else {
                    //get mapping from expand attribute
                    var expandAttr;
                    if (typeof expand === 'string') {
                        //get expand attribute as string
                        expandAttr = expand;
                    }
                    else if ((typeof expand === 'object') && hasOwnProperty(expand, 'name')) {
                        //get expand attribute from Object.name property
                        expandAttr = expand.name;
                        //get expand options
                        if (typeof expand.options !== 'undefined' && expand.options !== null) {
                            options = expand.options;
                        }
                    }
                    else {
                        //invalid expand parameter
                        return callback(new Error('Invalid expand option. Expected string or a named object.'));
                    }
                    field = self.model.field(expandAttr);
                    if (typeof field === 'undefined')
                        field = self.model.attributes.find(function(x) { return x.type===expandAttr });
                    if (field) {
                        mapping = self.model.inferMapping(field.name);
                        if (expands.find(function(x) {
                                return (x.parentField === mapping.parentField) &&
                                    (x.parentModel === mapping.parentModel) &&
                                    (x.childField === mapping.childField) &&
                                    (x.childModel === mapping.childModel)
                            })) {
                            return cb();
                        }
                        if (mapping) {
                            mapping.refersTo = mapping.refersTo || field.name;
                            if (_.isObject(mapping.options)) {
                                _.assign(options, mapping.options);
                            }
                            else if (_.isArray(mapping.select) && mapping.select.length>0) {
                                options['$select'] = mapping.select.join(',');
                            }
                            // check data view attribute mapping options
                            if (self.$view) {
                                // get view field
                                var re = new RegExp('^' + expand.name + '$', 'ig');
                                var viewField = self.$view.fields.find(function(x) {
                                    return re.test(x.name);
                                });
                                // if view field has mapping options
                                if (viewField && viewField.mapping && viewField.mapping.options) {
                                    // assign this options to expand options
                                    _.assign(options, viewField.mapping.options);
                                }
                            }
                        }
                    }
                }
                if (options instanceof DataQueryable) {
                    // do nothing
                }
                else {
                    //set default $top option to -1 (backward compatibility issue)
                    if (!hasOwnProperty(options, '$top')) {
                        options['$top'] = -1;
                    }
                    //set default $levels option to 1 (backward compatibility issue)
                    if (!hasOwnProperty(options, '$levels')) {
                        if (typeof self.$levels === 'number') {
                            options['$levels'] = self.getLevels() - 1;
                        }
                    }
                }
            }
            catch(e) {
                return cb(e);
            }

            if (mapping) {
                //clone mapping
                var thisMapping = _.assign({}, mapping);
                thisMapping.options = options;
                if (mapping.associationType==='association' || mapping.associationType==='junction') {
                    if ((mapping.parentModel===self.model.name) && (mapping.associationType==='association')) {
                        // handle parent-child association in same model
                        if (mapping.childModel===self.model.name) {
                            return new DataMappingExtender(thisMapping).for(self).getAssociatedParents(result)
                                .then(function() {
                                    return cb();
                                }).catch(function(err) {
                                    return cb(err);
                                });
                        }
                        return new DataMappingExtender(thisMapping).for(self).getAssociatedChildren(result)
                            .then(function() {
                                return cb();
                            }).catch(function(err) {
                                return cb(err);
                            });
                    }
                    else if (mapping.childModel===self.model.name && mapping.associationType==='junction') {
                        return new DataMappingExtender(thisMapping).for(self).getParents(result)
                            .then(function() {
                                return cb();
                        }).catch(function(err) {
                           return cb(err);
                        });
                    }
                    else if (mapping.parentModel===self.model.name && mapping.associationType==='junction') {
                        return new DataMappingExtender(thisMapping).for(self).getChildren(result)
                            .then(function() {
                                return cb();
                            }).catch(function(err) {
                                return cb(err);
                            });
                    }
                        else if ((mapping.childModel===self.model.name) && (mapping.associationType==='association')) {
                            return new DataMappingExtender(thisMapping).for(self).getAssociatedParents(result)
                                .then(function() {
                                    return cb();
                                }).catch(function(err) {
                                    return cb(err);
                                });
                        }
                }
                else {
                    return cb(new Error('Not yet implemented'));
                }
            }
            else {
                return cb(new DataError('E_ASSOCIATION', sprintf('Data association mapping (%s) for %s cannot be found or the association between these two models defined more than once.', expand, self.model.name), null, self.model));
            }
        }, function(err) {
            if (err) {
                callback(err);
            }
            else {
                toArrayCallback.call(self, result, callback);
            }
        });
    }
    else {
        toArrayCallback.call(self, result, callback);
    }
}

/**
 * @this DataQueryable
 * @private
 * @memberOf DataQueryable#
 * @param {Array|*} result
 * @param {Function} callback
 */
function toArrayCallback(result, callback) {
    try {
        var self = this;
        if (self.$asArray) {
            if (typeof self.query === 'undefined') {
                return callback(null, result);
            }
            var fields = self.query.fields();
            if (_.isArray(fields)===false) {
                return callback(null, result);
            }
            if (fields.length===1) {
                var arr = [];
                result.forEach(function(x) {
                    if (_.isNil(x))
                        return;
                    var key = Object.keys(x)[0];
                    if (x[key])
                        arr.push(x[key]);
                });
                return callback(null, arr);
            }
            else {
                return callback(null, result);
            }
        }
        else {
            return callback(null, result);
        }
    }
    catch (e) {
        return callback(e);
    }
}

/**
 * Disables permission listeners and executes the underlying query without applying any permission filters
 * @param {Boolean=} value - A boolean which represents the silent flag. If value is missing the default parameter is true.
 * @returns {DataQueryable}
 * @example
 //retrieve user
 context.model('User')
 .where('name').equal('other@example.com')
 .silent()
 .first().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.silent = function(value) {
    /**
     * @type {boolean}
     * @private
     */
    this.$silent = false;
    if (typeof value === 'undefined') {
        this.$silent = true;
    }
    else {
        this.$silent = value;
    }
    return this;
};
/**
 * Returns true or false to indicate whether this queryable object is in silent mode or not
 * @returns {boolean}
 */
DataQueryable.prototype.isSilent = function() {
    return !!this.$silent;
}

/**
 * Generates a MD5 hashed string for this DataQueryable instance
 * @returns {string}
 */
DataQueryable.prototype.toMD5 = function() {
    return TextUtils.toMD5({
        query: this.query,
        $expand: this.$expand,
        $levels: this.$levels,
        $flatten: this.$flatten,
        $silent: this.$silent,
        $asArray: this.$asArray
    });
};

/**
 * @param {Boolean=} value
 * @returns {DataQueryable}
 */
DataQueryable.prototype.asArray = function(value) {
    /**
     * @type {boolean}
     * @private
     */
    this.$asArray = false;
    if (typeof value === 'undefined') {
        this.$asArray = true;
    }
    else {
        this.$asArray = value;
    }
    return this;
};
/**
 * Gets or sets query data. This data may be used in before and after execute listeners.
 * @param {string=} name
 * @param {*=} value
 * @returns {DataQueryable|*}
 */
DataQueryable.prototype.data = function(name, value) {
    this.query.data = this.query.data || {};
    if (typeof name === 'undefined') {
        return this.query.data;
    }
    if (typeof value === 'undefined') {
        return this.query.data[name];
    }
    else {
        this.query.data[name] = value;
    }
    return this;
};
/**
 * Gets or sets a string which represents the title of this DataQueryable instance. This title may be used in caching operations
 * @param {string=} value - The title of this DataQueryable instance
 * @returns {string|DataQueryable}
 */
DataQueryable.prototype.title = function(value) {
    return this.data('title', value);
};
/**
 * Gets or sets a boolean which indicates whether results should be cached or not. This parameter is valid for models which have caching mechanisms.
 * @param {boolean=} value
 * @returns {string|DataQueryable}
 */
DataQueryable.prototype.cache = function(value) {
    return this.data('cache', value);
};

/**
 * Sets an expandable field or collection of fields. An expandable field produces nested objects based on the association between two models.
 * @param {...string|*} attr - A param array of strings which represents the field or the array of fields that are going to be expanded.
 * If attr is missing then all the previously defined expandable fields will be removed.
 * @returns {DataQueryable}
 */
DataQueryable.prototype.expand = function(attr) {

    var self = this,
        arg = (arguments.length>1) ? Array.prototype.slice.call(arguments): [attr];
    var expanded;
    if (typeof attr === 'function') {
        var args = Array.from(arguments);
        try {
            /**
             * @type {import("@themost/query").QueryExpression}
             */
            var query = this.clone().query;
            // clear select
            var onResolvingMember = function(event) {
                var member = event.member.split('.');
                self.expand(member[1]);
            };
            var onResolvingJoinMember = function(event) {
                /**
                 * @type {string}
                 */
                var member = event.fullyQualifiedMember;
                var index = member.lastIndexOf('.');
                while(index >= 0) {
                    member = member.substring(0, index) + '($expand=' +  member.substring(index + 1, member.length) + ')'
                    index = member.lastIndexOf('.');
                }
                var result = new DataExpandResolver().test(member);
                if (result && result.length) {
                    self.expand(result[0]);
                }
            };
            query.resolvingMember.subscribe(onResolvingMember);
            query.resolvingJoinMember.subscribe(onResolvingJoinMember);
            // check if last argument is closure parameters
            let params = null;
            if (typeof args[args.length - 1] !== 'function') {
                params = args.pop();
            }
            args.forEach(function(argument) {
                query.select.call(query, argument, params);
            });
        } finally {
            query.resolvingMember.unsubscribe(onResolvingMember);
            query.resolvingJoinMember.unsubscribe(onResolvingJoinMember);
        }
        return this;
    }

    if (_.isNil(arg)) {
        delete self.$expand;
    }
    else {
        if (!_.isArray(this.$expand))
            self.$expand=[];
        _.forEach(arg,function(x) {
            if (_.isNil(x)) {
                return;
            }
            if ((typeof x === 'string') || (x instanceof DataAssociationMapping)
                || (typeof x === 'object' && hasOwnProperty(x, 'name'))) {
                expanded = self.hasExpand(x);
                if (expanded) {
                    //expandable already exists
                    if (_.isObject(x.options)) {
                        if (typeof expanded === 'string') {
                            //remove expand as string
                            var ix = self.$expand.indexOf(expanded);
                            self.$expand.splice(ix,1);
                            //push expand as object with options
                            self.$expand.push(x);
                        }
                        else if (typeof expanded === 'object') {
                            //ensure expand options
                            expanded.options = expanded.options || {};
                            //assign options to expand.options
                            _.assign(expanded.options, x.options);
                        }
                    }
                }
                else {
                    self.$expand.push(x);
                }
            }
            else {
                throw new Error('Expand option may be a string or a named object.')
            }
        });
    }
    return self;
};

DataQueryable.prototype.hasExpand = function(attr) {
    if (_.isNil(this.$expand)) {
        return false;
    }

    var expand = attr;
    if (typeof attr === 'string') {
        expand = attr;
    }
    else if (typeof attr.name === 'string') {
        expand = attr.name;
    }

    return  _.find(this.$expand, function(x) {
        if (typeof x === 'string') {
            return x === expand;
        }
        else if (x instanceof DataAssociationMapping) {
            return x === expand;
        }
        else if (typeof x.name === 'string') {
            return x.name === expand;
        }
        return false;
    });
};

/**
 * Disables expandable fields
 * @param {boolean=} value - If the value is true the result will contain only flat objects -without any nested associated object-,
 * even if model definition contains expandable fields. If value is missing, the default parameter is true
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders
 context.model('Order')
 .flatten()
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 id  customer  orderStatus  paymentMethod
 --  --------  -----------  -------------
 1   299       5            6
 2   337       7            5
 3   309       3            3
 4   257       2            4
 5   285       5            2
 */
DataQueryable.prototype.flatten = function(value) {

    if (value || (typeof value==='undefined')) {
        //delete expandable data (if any)
        delete this.$expand;
        this.$flatten = true;
    }
    else {
        delete this.$flatten;
    }
    if (this.$flatten) {
        this.$levels = 0;
    }
    return this;
};
/**
 * Prepares an addition (e.g. ([field] + 4))
 * @param {number|*} x - The
 * @returns {DataQueryable}
 * @example
 //retrieve a list of products
 context.model('Product')
 .select('id','name', 'price')
 //perform ((ProductData.price + 100)>300)
 .where('price').add(100).lowerThan(300)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.add = function(x) {
    this.query.add(x); return this;
};
/**
 * Prepares a subtraction (e.g. ([field] - 4))
 * @param {number|*} x
 * @returns {DataQueryable}
 //retrieve a list of orders
 context.model('Product')
 .select('id','name', 'price')
 //perform ((ProductData.price - 50)<150)
 .where('price').subtract(50).lowerThan(150)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.subtract = function(x) {
    this.query.subtract(x); return this;
};

/**
 * Prepares a multiplication (e.g. ([field] * 0.2))
 * @param {number} x
 * @returns {DataQueryable}
 @example
 //retrieve a list of orders
 context.model('Product')
 .select('id','name', 'price')
 //perform ((ProductData.price * 0.2)<50)
 .where('price').multiply(0.2).lowerThan(50)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.multiply = function(x) {
    this.query.multiply(x); return this;
};

/**
 * Prepares a division (e.g. ([field] / 0.2))
 * @param {number} x
 * @returns {DataQueryable}
 @example
 //retrieve a list of orders
 context.model('Product')
 .select('id','name', 'price')
 //perform ((ProductData.price / 0.8)>500)
 .where('price').divide(0.8).greaterThan(500)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.divide = function(x) {
    this.query.divide(x); return this;
};

/**
 * * Prepares a round mathematical expression
 * @param {number=} n
 * @returns {DataQueryable}
 */
DataQueryable.prototype.round = function(n) {
    this.query.round(n); return this;
};
/**
 * Prepares a substring comparison
 * @param {number} start - The position where to start the extraction. First character is at index 0
 * @param {number=} length - The number of characters to extract
 * @returns {DataQueryable}
 * @example
 //retrieve a list of persons
 context.model('Person')
 .select('givenName')
 .where('givenName').substr(0,4).equal('Alex')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 givenName
 ---------
 Alex
 Alexis
 */
DataQueryable.prototype.substr = function(start,length) {
    this.query.substr(start,length); return this;
};
/**
 * Prepares an indexOf comparison
 * @param {string} s The string to search for
 * @returns {DataQueryable}
 * @example
 //retrieve a list of persons
 context.model('Person')
 .select('givenName')
 .where('givenName').indexOf('a').equal(1)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 givenName
 ---------
 Daisy
 Maxwell
 Mackenzie
 Zachary
 Mason
 */
DataQueryable.prototype.indexOf = function(s) {
    this.query.indexOf(s); return this;
};
/**
 * Prepares a string concatenation expression
 * @param {string} s
 * @returns {DataQueryable}
 */
DataQueryable.prototype.concat = function(s) {
    this.query.concat(s); return this;
};
/**
 * Prepares a string trimming expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.trim = function() {
    this.query.trim(); return this;
};
/**
 * Prepares a string length expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of persons
 context.model('Person')
 .select('givenName')
 .where('givenName').length().equal(5)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 givenName
 ---------
 Daisy
 Peter
 Kylie
 Colin
 Lydia
 */
DataQueryable.prototype.length = function() {
    this.query.length(); return this;
};
/**
 * Prepares an expression by getting the date only value of a datetime field
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders
 context.model('Order')
 .select('id','paymentDue', 'orderDate')
 .where('orderDate').getDate().equal('2015-01-16')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.getDate = function() {
    this.query.getDate(); return this;
};
/**
 * Prepares an expression by getting the year of a datetime field
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders made during 2015
 context.model('Order')
 .where('orderDate').getYear().equal(2015)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.getYear = function() {
    this.query.getYear(); return this;
};
/**
 * Prepares an expression by getting the year of a datetime field
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders made during 2015
 context.model('Order')
 .where('orderDate').getYear().equal(2015)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.getFullYear = function() {
    this.query.getYear(); return this;
};
/**
 * Prepares an expression by getting the month (from 1 to 12) of a datetime field.
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders made during October 2015
 context.model('Order')
 .where('orderDate').getYear().equal(2015)
 .and('orderDate').getMonth().equal(10)
  .take(5).list().then(function(result) {
        console.table(result.records);
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.getMonth = function() {
    this.query.getMonth(); return this;
};
// noinspection JSUnusedGlobalSymbols
/**
 * Prepares an expression by getting the day of the month of a datetime field
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders
 context.model('Order')
 .where('orderDate').getYear().equal(2015)
 .and('orderDate').getMonth().equal(1)
 .and('orderDate').getDay().equal(16)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.getDay = function() {
    this.query.getDay(); return this;
};
// noinspection JSUnusedGlobalSymbols
/**
 * Prepares an expression by getting the hours (from 0 to 23) a datetime field
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getHours = function() {
    this.query.getHours(); return this;
};
// noinspection JSUnusedGlobalSymbols
/**
 * Prepares an expression by getting the minutes (from 0 to 59) a datetime field
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getMinutes = function() {
    this.query.getMinutes(); return this;
};
// noinspection JSUnusedGlobalSymbols
/**
 * Prepares an expression by getting the seconds (from 0 to 59) a datetime field
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getSeconds = function() {
    this.query.getSeconds(); return this;
};
/**
 * Prepares a floor mathematical expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.floor = function() {
    this.query.floor(); return this;
};
/**
 * Prepares a ceil mathematical expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.ceil = function() {
    this.query.ceil(); return this;
};

/**
 * Prepares a lower case string comparison
 * @returns {DataQueryable}
 */
DataQueryable.prototype.toLocaleLowerCase = function() {
    this.query.toLocaleLowerCase(); return this;
};
/**
 * Prepares a lower case string comparison
 * @returns {DataQueryable}
 * @example
 //retrieve a list of persons
 context.model('Person')
 .where('givenName').toLocaleLowerCase().equal('alexis')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.toLowerCase = function() {
    return this.toLocaleLowerCase();
};
/**
 * Prepares an upper case string comparison
 * @returns {DataQueryable}
 */
DataQueryable.prototype.toLocaleUpperCase = function() {
    this.query.toLocaleUpperCase(); return this;
};
/**
 * Prepares an upper case string comparison
 * @returns {DataQueryable}
 */
DataQueryable.prototype.toUpperCase = function() {
    return this.toLocaleUpperCase();
};
/**
 * @this DataQueryable
 * @private
 * @memberOf DataQueryable#
 * @param {Function} callback
 */
function valueInternal(callback) {
    if (_.isNil(this.query.$select)) {
        this.select(this.model.primaryKey);
    }
    firstInternal.call(this, function(err, result) {
        if (err) { return callback(err); }
        if (_.isNil(result)) { return callback(); }
        var key = Object.keys(result)[0];
        if (typeof key === 'undefined') { return callback(); }
        callback(null, result[key]);
    });
}

/**
 * Executes the underlying query and a single value.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result.
 * @returns {Promise|*}
 * @example
 //retrieve the full name (description) of a person
 context.model('Person')
 .where('user').equal(330)
 .select('description')
 .value().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.value = function(callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        valueInternal.call(this, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return valueInternal.call(this, callback);
    }
};


/**
 * Sets the number of levels of the expandable attributes.
 * The default value is 1 which means that any expandable attribute will be flat (without any other nested attribute).
 * If the value is greater than 1 then the nested objects may contain other nested objects and so on.
 * @param {Number=} value - A number which represents the number of levels which are going to be used in expandable attributes.
 * @returns {DataQueryable}
 * @example
 //get orders, expand customer and get customer's nested objects if any.
 context.model('Order')
 .orderByDescending('dateCreated)
 .expand('customer')
 .levels(2)
 .getItems().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.levels = function(value) {
    /**
     * @type {number}
     * @private
     */
    this.$levels = 1;
    if (value == null) {
        this.$levels = 1;
    }
    else if (typeof value === 'number') {
        this.$levels = parseInt(value, 10);
    }
    //set flatten property (backward compatibility issue)
    this.$flatten = (this.$levels < 1);
    return this;
};

/**
 * Gets the number of levels of the expandable objects
 * @returns {number}
 */
DataQueryable.prototype.getLevels = function() {
    if (typeof this.$levels === 'number') {
        return this.$levels;
    }
    return 1;
};

/**
 * Converts a DataQueryable instance to an object which is going to be used as parameter in DataQueryable.expand() method
 *  @param {String} attr - A string which represents the attribute of a model which is going to be expanded with the options specified in this instance of DataQueryable.
 *
 *  @example
 //get customer and customer orders with options (e.g. select specific attributes and sort orders by order date)
 context.model("Person")
 .search("Daisy")
 .expand(context.model("Order").select("id", "customer","orderStatus", "orderDate", "orderedItem").levels(2).orderByDescending("orderDate").take(10).toExpand("orders"))
 .take(3)
 .getItems()
 .then(function (result) {
        console.log(JSON.stringify(result));
        done();
    }).catch(function (err) {
    done(err);
});
 *
 */
DataQueryable.prototype.toExpand = function(attr) {
    if ((typeof attr === 'string') && (attr.length>0)) {
        return {
            name: attr,
            options: this
        }
    }
    throw new Error('Invalid parameter. Expected not empty string.')
};
/**
 * Executes the specified query and returns the first object which satisfy the specified criteria.
 * @returns {Promise|*}
 */
DataQueryable.prototype.getItem = function() {
    var self = this, d = Q.defer();
    process.nextTick(function() {
        self.first().then(function (result) {
            return d.resolve(result);
        }).catch(function(err) {
            return d.reject(err);
        });
    });
    return d.promise;
};
/**
 * Gets an instance of DataObject by executing the defined query.
 * @returns {Promise|*}
 */
DataQueryable.prototype.getTypedItem = function() {
    var self = this;
    return Q.Promise(function (resolve, reject) {
        self.first().then(function (result) {
            return resolve(self.model.convert(result));
        }).catch(function(err) {
            return reject(err);
        });
    });
};
/**
 * Gets a collection of DataObject instances by executing the defined query.
 * @returns {Promise|*}
 */
DataQueryable.prototype.getTypedItems = function() {
    var self = this, d = Q.defer();
    process.nextTick(function() {
        self.getItems().then(function (result) {
            return d.resolve(self.model.convert(result));
        }).catch(function(err) {
            return d.reject(err);
        });
    });
    return d.promise;
};

/**
 * Gets a result set that contains a collection of DataObject instances by executing the defined query.
 * @returns {Promise|*}
 */
DataQueryable.prototype.getTypedList = function() {
    var self = this, d = Q.defer();
    process.nextTick(function() {
        self.list().then(function (result) {
            result.value = self.model.convert(result.value.slice(0));
            return d.resolve(result);
        }).catch(function(err) {
            return d.reject(err);
        });
    });
    return d.promise;
};

/**
 * Executes the specified query and returns all objects which satisfy the specified criteria.
 * @returns {Promise|*}
 */
DataQueryable.prototype.getAllItems = function() {
    return this.all();
};
// noinspection JSUnusedGlobalSymbols
/**
 * Executes the specified query and returns all objects which satisfy the specified criteria.
 * @returns {Promise|*}
 */
DataQueryable.prototype.getAllTypedItems = function() {
    return this.skip(0).take(-1).getTypedItems();
};
/**
 * Prepares a query with dictinct values
 * @returns {this}
 */
DataQueryable.prototype.distinct = function() {
    this.query.distinct();
    return this;
};

module.exports = {
    DataQueryable
}

// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const async = require('async');
const _ = require('lodash');
const {TextUtils, DataError} = require('@themost/common');
const { DataMappingExtensions } = require('./data-mapping-extensions');
const { DataAssociationMapping } = require('./types');
// eslint-disable-next-line no-unused-vars
const { QueryField, QueryUtils, QueryEntity, QueryExpression } = require('@themost/query');
const aliasProperty = Symbol('alias');
const { hasOwnProperty } = require('./has-own-property');
/**
 * @class
 */
class DataAttributeResolver {
    constructor() {
    }
    orderByNestedAttribute(attr) {
        let nestedAttribute = DataAttributeResolver.prototype.testNestedAttribute(attr);
        if (nestedAttribute) {
            let matches = /^(\w+)\((\w+)\/(\w+)\)$/i.exec(nestedAttribute.name);
            if (matches) {
                return DataAttributeResolver.prototype.selectAggregatedAttribute.call(this, matches[1], matches[2] + '/' + matches[3]);
            }
            matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)$/i.exec(nestedAttribute.name);
            if (matches) {
                return DataAttributeResolver.prototype.selectAggregatedAttribute.call(this, matches[1], matches[2] + '/' + matches[3] + '/' + matches[4]);
            }
        }
        return DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr);
    }
    selectNestedAttribute(attr, alias) {
        let expr = DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr);
        if (expr) {
            if (_.isNil(alias)) {
                expr.as(attr.replace(/\//g, '_'));
            } else {
                expr.as(alias);
            }
        }
        return expr;
    }
    /**
     * @param {string} aggregation
     * @param {string} attribute
     * @param {string=} alias
     * @returns {*}
     */
    selectAggregatedAttribute(aggregation, attribute, alias) {
        let self = this, result;
        if (DataAttributeResolver.prototype.testNestedAttribute(attribute)) {
            result = DataAttributeResolver.prototype.selectNestedAttribute.call(self, attribute, alias);
        } else {
            result = self.fieldOf(attribute);
        }
        let sAlias = result.as(), name = result.getName(), expr;
        if (sAlias) {
            expr = result[sAlias];
            result[sAlias] = {};
            result[sAlias]['$' + aggregation] = expr;
        } else {
            expr = result.$name;
            result[name] = {};
            result[name]['$' + aggregation] = expr;
        }
        return result;
    }
    resolveNestedAttribute(attr) {
        let self = this;
        if (typeof attr === 'string' && /\//.test(attr)) {
            let member = attr.split('/'), expr, arr, obj, select;
            //change: 18-Feb 2016
            //description: Support many to many (junction) resolving
            let mapping = self.model.inferMapping(member[0]);
            if (mapping && mapping.associationType === 'junction') {
                let expr1 = DataAttributeResolver.prototype.resolveJunctionAttributeJoin.call(self.model, attr);
                //select field
                select = expr1.$select;
                //get expand
                expr = expr1.$expand;
            } else {
                // create member expression
                let memberExpr = {
                    name: attr
                };
                // and pass member expression
                expr = DataAttributeResolver.prototype.resolveNestedAttributeJoin.call(self.model, memberExpr);
                //select field
                if (member.length > 2) {
                    if (memberExpr.name !== attr) {
                        // get member segments again because they have been modified
                        member = memberExpr.name.split('/');
                    }
                    select = QueryField.select(member[member.length - 1]).from(member[member.length - 2]);
                } else {
                    if (memberExpr.name !== attr) {
                        // get member segments again because they have been modified
                        member = memberExpr.name.split('/');
                    }
                    // and create query field expression
                    select = QueryField.select(member[1]).from(member[0]);
                }
            }
            if (expr) {
                if (_.isNil(self.query.$expand)) {
                    self.query.$expand = expr;
                } else {
                    arr = [];
                    if (!_.isArray(self.query.$expand)) {
                        arr.push(self.query.$expand);
                        this.query.$expand = arr;
                    }
                    arr = [];
                    if (_.isArray(expr)) {
                        arr.push.apply(arr, expr);
                    } else {
                        arr.push(expr);
                    }
                    arr.forEach(function (y) {
                        obj = self.query.$expand.find(function (x) {
                            /**
                             * @type {{$as:string}}
                             */
                            const entity = x.$entity;
                            if (entity && entity.$as) {
                                return (entity.$as === y.$entity.$as);
                            }
                            return false;
                        });
                        if (typeof obj === 'undefined') {
                            self.query.$expand.push(y);
                        }
                    });
                }
                return select;
            } else {
                throw new Error('Member join expression cannot be empty at this context');
            }
        }
    }
    /**
     *
     * @param {*} memberExpr - A string that represents a member expression e.g. user/id or article/published etc.
     * @returns {*} - An object that represents a query join expression
     */
    resolveNestedAttributeJoin(memberExpr) {
        let self = this, childField, parentField, res, expr, entity;
        let memberExprString;
        if (typeof memberExpr === 'string') {
            memberExprString = memberExpr;
        } else if (typeof memberExpr === 'object' && hasOwnProperty(memberExpr, 'name')) {
            memberExprString = memberExpr.name;
        }
        if (/\//.test(memberExprString)) {
            //if the specified member contains '/' e.g. user/name then prepare join
            let arrMember = memberExprString.split('/');
            let attrMember = self.field(arrMember[0]);
            if (_.isNil(attrMember)) {
                throw new DataError('E_ASSOCIATION', 'The specified field cannot be found', null, self.name, arrMember[0]);
            }
            //search for field mapping
            let mapping = self.inferMapping(arrMember[0]);
            if (_.isNil(mapping)) {
                throw new DataError('E_ASSOCIATION', 'The target model does not have an association defined for the specified attribute', null, self.name, arrMember[0]);
            }
            if (mapping.childModel === self.name && mapping.associationType === 'association') {
                //get parent model
                let parentModel = self.context.model(mapping.parentModel);
                if (_.isNil(parentModel)) {
                    throw new DataError('E_ASSOCIATION', 'Association parent model cannot be found.', null, mapping.parentModel);
                }
                childField = self.field(mapping.childField);
                if (_.isNil(childField)) {
                    throw new DataError('E_ASSOCIATION', 'Association field cannot be found.', null, self.name, mapping.childField);
                }
                parentField = parentModel.field(mapping.parentField);
                if (_.isNil(parentField)) {
                    throw new DataError('E_FIELD', 'Referenced field cannot be found.', null, parentModel.name, mapping.parentField);
                }
                // get childField.name or childField.property
                let childFieldName = childField.property || childField.name;
                /**
                 * store temp query expression
                 * @type QueryExpression
                 */
                res = QueryUtils.query(self.viewAdapter).select(['*']);
                expr = QueryUtils.query().where(QueryField.select(childField.name)
                    .from(self[aliasProperty] || self.viewAdapter))
                    .equal(QueryField.select(mapping.parentField).from(childFieldName));
                entity = new QueryEntity(parentModel.viewAdapter).as(childFieldName).left();
                // add a reference to the underlying data model for further processing
                Object.defineProperty(entity, 'model', {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: parentModel.name
                });
                res.join(entity).with(expr);
                if (arrMember.length > 2) {
                    parentModel[aliasProperty] = mapping.childField;
                    expr = DataAttributeResolver.prototype.resolveNestedAttributeJoin.call(parentModel, arrMember.slice(1).join('/'));
                    return [].concat(res.$expand).concat(expr);
                }
                //--set active field
                return res.$expand;
            } else if (mapping.parentModel === self.name && mapping.associationType === 'association') {
                let childModel = self.context.model(mapping.childModel);
                if (_.isNil(childModel)) {
                    throw new DataError('E_ASSOCIATION', 'Association child model cannot be found.', null, self.name, mapping.parentField);
                }
                childField = childModel.field(mapping.childField);
                if (_.isNil(childField)) {
                    throw new DataError('E_ASSOCIATION', 'Association child field cannot be found.', null, childModel.name, mapping.childField);
                }
                parentField = self.field(mapping.parentField);
                if (_.isNil(parentField)) {
                    throw new DataError('E_FIELD', 'Referenced field cannot be found.', null, self.name, mapping.parentField);
                }
                // get parent entity name for this expression
                let parentEntity = self[aliasProperty] || self.viewAdapter;
                // get child entity name for this expression
                let childEntity = arrMember[0];
                res = QueryUtils.query('Unknown').select(['*']);
                expr = QueryUtils.query().where(QueryField.select(parentField.name).from(parentEntity)).equal(QueryField.select(childField.name).from(childEntity));
                entity = new QueryEntity(childModel.viewAdapter).as(childEntity).left();
                // add a reference to the underlying data model for further processing
                Object.defineProperty(entity, 'model', {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: childModel.name
                });
                res.join(entity).with(expr);
                if (arrMember.length === 2) {
                    // get child model member
                    let childMember = childModel.field(arrMember[1]);
                    if (childMember) {
                        // try to validate if child member has an alias or not
                        if (childMember.name !== arrMember[1]) {
                            arrMember[1] = childMember.name;
                            // set memberExpr
                            if (typeof memberExpr === 'object' && hasOwnProperty(memberExpr, 'name')) {
                                memberExpr.name = arrMember.join('/');
                            }
                        }
                    }
                }
                return res.$expand;
            } else {
                const err1 = new DataError('E_ASSOCIATION', 'The association type is not supported for filtering, grouping or sorting data.');
                Object.assign(err1, {
                    parentModel: mapping.parentModel,
                    childModel: mapping.childModel
                })
                throw err1;
            }
        }
    }
    /**
     * @param {string} s
     * @returns {*}
     */
    testAttribute(s) {
        if (typeof s !== 'string') {
            return;
        }
        /**
         * @private
         */
        let matches;
        /**
         * attribute aggregate function with alias e.g. f(x) as a
         * @ignore
         */
        matches = /^(\w+)\((\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '(' + matches[2] + ')', property: matches[3] };
        }
        /**
         * attribute aggregate function with alias e.g. x as a
         * @ignore
         */
        matches = /^(\w+)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
        if (matches) {
            return { name: matches[1], property: matches[2] };
        }
        /**
         * attribute aggregate function with alias e.g. f(x)
         * @ignore
         */
        matches = /^(\w+)\((\w+)\)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '(' + matches[2] + ')' };
        }
        // only attribute e.g. x
        if (/^(\w+)$/.test(s)) {
            return { name: s };
        }
    }
    /**
     * @param {string} s
     * @returns {*}
     */
    testAggregatedNestedAttribute(s) {
        if (typeof s !== 'string') {
            return;
        }
        /**
         * @private
         */
        let matches;
        /**
         * nested attribute aggregate function with alias e.g. f(x/b) as a
         * @ignore
         */
        matches = /^(\w+)\((\w+)\/(\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
        if (matches) {
            return { aggr: matches[1], name: matches[2] + '/' + matches[3], property: matches[4] };
        }
        /**
         * nested attribute aggregate function with alias e.g. f(x/b/c) as a
         * @ignore
         */
        matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
        if (matches) {
            return { aggr: matches[1], name: matches[2] + '/' + matches[3] + '/' + matches[4], property: matches[5] };
        }
        /**
         * nested attribute aggregate function with alias e.g. f(x/b)
         * @ignore
         */
        matches = /^(\w+)\((\w+)\/(\w+)\)$/i.exec(s);
        if (matches) {
            return { aggr: matches[1], name: matches[2] + '/' + matches[3] };
        }
        /**
         * nested attribute aggregate function with alias e.g. f(x/b/c)
         * @ignore
         */
        matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)$/i.exec(s);
        if (matches) {
            return { aggr: matches[1], name: matches[2] + '/' + matches[3] + '/' + matches[4] };
        }
    }
    /**
     * @param {string} s
     * @returns {*}
     */
    testNestedAttribute(s) {
        if (typeof s !== 'string') {
            return;
        }
        /**
         * @private
         */
        let matches;
        /**
         * nested attribute aggregate function with alias e.g. f(x/b) as a
         * @ignore
         */
        matches = /^(\w+)\((\w+)\/(\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '(' + matches[2] + '/' + matches[3] + ')', property: matches[4] };
        }
        /**
         * nested attribute aggregate function with alias e.g. f(x/b/c) as a
         * @ignore
         */
        matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '(' + matches[2] + '/' + matches[3] + '/' + matches[4] + ')', property: matches[5] };
        }
        /**
         * nested attribute aggregate function with alias e.g. f(x/b/c/d) as a
         * @ignore
         */
        matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\/(\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '(' + matches[2] + '/' + matches[3] + '/' + matches[4] + '/' + matches[5] + ')', property: matches[6] };
        }
        /**
         * nested attribute with alias e.g. x/b as a
         * @ignore
         */
        matches = /^(\w+)\/(\w+)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '/' + matches[2], property: matches[3] };
        }
        /**
         * nested attribute with alias e.g. x/b/c as a
         * @ignore
         */
        matches = /^(\w+)\/(\w+)\/(\w+)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '/' + matches[2] + '/' + matches[3], property: matches[4] };
        }
        /**
         * nested attribute with alias e.g. x/b/c/d as a
         * @ignore
         */
        matches = /^(\w+)\/(\w+)\/(\w+)\/(\w+)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '/' + matches[2] + '/' + matches[3] + '/' + matches[4], property: matches[5] };
        }
        /**
         * nested attribute aggregate function with alias e.g. f(x/b)
         * @ignore
         */
        matches = /^(\w+)\((\w+)\/(\w+)\)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '(' + matches[2] + '/' + matches[3] + ')' };
        }
        /**
         * nested attribute aggregate function with alias e.g. f(x/b/c)
         * @ignore
         */
        matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '(' + matches[2] + '/' + matches[3] + '/' + matches[4] + ')' };
        }
        /**
         * nested attribute aggregate function with alias e.g. f(x/b/c/d)
         * @ignore
         */
        matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\/(\w+)\)$/i.exec(s);
        if (matches) {
            return { name: matches[1] + '(' + matches[2] + '/' + matches[3] + '/' + matches[4] + matches[5] + ')' };
        }
        /**
         * nested attribute with alias e.g. x/b
         * @ignore
         */
        matches = /^(\w+)\/(\w+)$/.exec(s);
        if (matches) {
            return { name: s };
        }

        /**
         * nested attribute with alias e.g. x/b/c
         * @ignore
         */
        matches = /^(\w+)\/(\w+)\/(\w+)$/.exec(s);
        if (matches) {
            return { name: s };
        }

        /**
         * nested attribute with alias e.g. x/b/c/d
         * @ignore
         */
        matches = /^(\w+)\/(\w+)\/(\w+)\/(\w+)$/.exec(s);
        if (matches) {
            return { name: s };
        }

    }
    /**
     * @param {string} attr
     * @returns {*}
     */
    resolveJunctionAttributeJoin(attr) {
        let self = this, member = attr.split('/');
        //get the data association mapping
        let mapping = self.inferMapping(member[0]);
        //if mapping defines a junction between two models
        if (mapping && mapping.associationType === 'junction') {
            //get field
            let field = self.field(member[0]), entity, expr, q;
            //first approach (default association adapter)
            //the underlying model is the parent model e.g. Group > Group Members
            if (mapping.parentModel === self.name) {

                q = QueryUtils.query(self.viewAdapter).select(['*']);
                //init an entity based on association adapter (e.g. GroupMembers as members)
                entity = new QueryEntity(mapping.associationAdapter).as(field.name);
                //init join expression between association adapter and current data model
                //e.g. Group.id = GroupMembers.parent
                expr = QueryUtils.query().where(QueryField.select(mapping.parentField).from(self.viewAdapter))
                    .equal(QueryField.select(mapping.associationObjectField).from(field.name));
                //append join
                q.join(entity).with(expr);
                //data object tagging
                if (typeof mapping.childModel === 'undefined') {
                    return {
                        $expand: [q.$expand],
                        $select: QueryField.select(mapping.associationValueField).from(field.name)
                    };
                }

                //return the resolved attribute for further processing e.g. members.id
                if (member[1] === mapping.childField) {
                    return {
                        $expand: [q.$expand],
                        $select: QueryField.select(mapping.associationValueField).from(field.name)
                    };
                } else {
                    //get child model
                    let childModel = self.context.model(mapping.childModel);
                    if (_.isNil(childModel)) {
                        throw new DataError('E_JUNCTION', 'The associated model cannot be found.', null, mapping.childModel);
                    }
                    //create new join
                    let alias = field.name + '_' + childModel.name;
                    entity = new QueryEntity(childModel.viewAdapter).as(alias);
                    expr = QueryUtils.query().where(QueryField.select(mapping.associationValueField).from(field.name))
                        .equal(QueryField.select(mapping.childField).from(alias));
                    //append join
                    q.join(entity).with(expr);
                    return {
                        $expand: q.$expand,
                        $select: QueryField.select(member[1]).from(alias)
                    };
                }
            } else {
                q = QueryUtils.query(self.viewAdapter).select(['*']);
                //the underlying model is the child model
                //init an entity based on association adapter (e.g. GroupMembers as groups)
                entity = new QueryEntity(mapping.associationAdapter).as(field.name);
                //init join expression between association adapter and current data model
                //e.g. Group.id = GroupMembers.parent
                expr = QueryUtils.query().where(QueryField.select(mapping.childField).from(self.viewAdapter))
                    .equal(QueryField.select(mapping.associationValueField).from(field.name));
                //append join
                q.join(entity).with(expr);
                //return the resolved attribute for further processing e.g. members.id
                if (member[1] === mapping.parentField) {
                    return {
                        $expand: [q.$expand],
                        $select: QueryField.select(mapping.associationObjectField).from(field.name)
                    };
                } else {
                    //get parent model
                    let parentModel = self.context.model(mapping.parentModel);
                    if (_.isNil(parentModel)) {
                        throw new DataError('E_JUNCTION', 'The associated model cannot be found.', null, mapping.parentModel);
                    }
                    //create new join
                    let parentAlias = field.name + '_' + parentModel.name;
                    entity = new QueryEntity(parentModel.viewAdapter).as(parentAlias);
                    expr = QueryUtils.query().where(QueryField.select(mapping.associationObjectField).from(field.name))
                        .equal(QueryField.select(mapping.parentField).from(parentAlias));
                    //append join
                    q.join(entity).with(expr);
                    return {
                        $expand: q.$expand,
                        $select: QueryField.select(member[1]).from(parentAlias)
                    };
                }
            }
        } else {
            throw new DataError('E_JUNCTION', 'The target model does not have a many to many association defined by the given attribute.', null, self.name, attr);
        }
    }
}

/**
 * @classdesc Represents a dynamic query helper for filtering, paging, grouping and sorting data associated with an instance of DataModel class.
 * @class
 * @property {QueryExpression|*} query - Gets or sets the current query expression
 * @property {DataModel|*} model - Gets or sets the underlying data model
 * @augments DataContextEmitter
 */
class DataQueryable {
    /**
     * @param {*} model 
     */
    constructor(model) {
        /**
         * @type {QueryExpression}
         * @private
         */
        let q = null;
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
        let m = model;
        Object.defineProperty(this, 'query', {
            get: function () {
                if (!q) {
                    if (!m) {
                        return null;
                    }
                    q = QueryUtils.query(m.viewAdapter);
                }
                return q;
            }, configurable: true, enumerable: false
        });

        Object.defineProperty(this, 'model', {
            get: function () {
                return m;
            }, configurable: true, enumerable: false
        });
        //get silent property
        if (m) {
            this.silent(m.$silent);
        }
    }
    /**
     * Clones the current DataQueryable instance.
     * @returns {DataQueryable|*} - The cloned object.
     */
    clone() {
        let result = new DataQueryable(this.model);
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
    }
    /**
     * Ensures data queryable context and returns the current data context. This function may be overridden.
     * @returns {DataContext}
     * @ignore
     */
    ensureContext() {
        if (this.model !== null) {
            if (this.model.context !== null) {
                return this.model.context;
            }
        }
        return null;
    }
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
    prepare(useOr) {
        this.query.prepare(useOr);
        return this;
    }
    /**
     * Initializes a where expression
     * @param attr {string} - A string which represents the field name that is going to be used as the left operand of this expression
     * @returns {DataQueryable}
     * @example
     context.model('Person')
     .where('user/name').equal('user1@exampl.com')
     .select('description')
     .first().then(function(result) {
            done(null, result);
        }).catch(function(err) {
            done(err);
        });
     */
    where(attr) {
        if (typeof attr === 'string' && /\//.test(attr)) {
            this.query.where(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr));
            return this;
        }
        this.query.where(this.fieldOf(attr));
        return this;
    }
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
    search(text) {
        let self = this;
        // eslint-disable-next-line no-unused-vars
        let options = { multiword: true };
        let terms = [];
        if (typeof text !== 'string') {
            return self;
        }
        let re = /("(.*?)")|([^\s]+)/g;
        let match = re.exec(text);
        while (match) {
            if (match[2]) {
                terms.push(match[2]);
            } else {
                terms.push(match[0]);
            }
            match = re.exec(text);
        }
        if (terms.length === 0) {
            return self;
        }
        self.prepare();
        let stringTypes = ['Text', 'URL', 'Note'];
        self.model.attributes.forEach(function (x) {
            if (x.many) {
                return;
            }
            let mapping = self.model.inferMapping(x.name);
            if (mapping) {
                if ((mapping.associationType === 'association') && (mapping.childModel === self.model.name)) {
                    let parentModel = self.model.context.model(mapping.parentModel);
                    if (parentModel) {
                        parentModel.attributes.forEach(function (z) {
                            if (stringTypes.indexOf(z.type) >= 0) {
                                terms.forEach(function (w) {
                                    if (!/^\s+$/.test(w)) {
                                        self.or(x.name + '/' + z.name).contains(w);
                                    }
                                });
                            }
                        });
                    }
                }
            }
            if (stringTypes.indexOf(x.type) >= 0) {
                terms.forEach(function (y) {
                    if (!/^\s+$/.test(y)) {
                        self.or(x.name).contains(y);
                    }
                });
            }
        });
        self.prepare();
        return self;
    }
    join(model) {
        let self = this;
        if (model == null) {
            return this;
        }
        /**
         * @type {DataModel}
         */
        let joinModel = self.model.context.model(model);
        //validate joined model
        if (joinModel == null) {
            throw new DataError('E_MODEL', 'The specified model cannot be found', null, model);
        }
        let arr = self.model.attributes.filter(function (x) {
            return x.type === joinModel.name;
        });
        if (arr.length === 0) {
            const err1 = new DataError('E_ASSOCIATION', 'An association between two models cannot be found', null, this.model.name);
            Object.assign(err1, {
                associationModel: model
            });
            throw err1;
        }
        let mapping = self.model.inferMapping(arr[0].name);
        let expr = QueryUtils.query();
        expr.where(self.fieldOf(mapping.childField)).equal(joinModel.fieldOf(mapping.parentField));
        /**
         * @type QueryEntity
         */
        let entity = new QueryEntity(joinModel.viewAdapter).left();
        //set join entity (without alias and join type)
        self.select().query.join(entity).with(expr);
        return self;
    }
    /**
     * Prepares a logical AND expression
     * @param attr {string} - The name of field that is going to be used in this expression
     * @returns {DataQueryable}
     */
    and(attr) {
        if (typeof attr === 'string' && /\//.test(attr)) {
            this.query.and(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr));
            return this;
        }
        this.query.and(this.fieldOf(attr));
        return this;
    }
    /**
     * Prepares a logical OR expression
     * @param attr {string} - The name of field that is going to be used in this expression
     * @returns {DataQueryable}
     */
    or(attr) {
        if (typeof attr === 'string' && /\//.test(attr)) {
            this.query.or(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr));
            return this;
        }
        this.query.or(this.fieldOf(attr));
        return this;
    }
    /**
     * Performs an equality comparison.
     * @param obj {*} - The right operand of the expression
     * @returns {DataQueryable}
     */
    equal(obj) {

        this.query.equal(resolveValue.bind(this)(obj));
        return this;
    }
    /**
     * Performs an equality comparison.
     * @param obj {*} - The right operand of the expression
     * @returns {DataQueryable}
     */
    is(obj) {
        return this.equal(obj);
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Prepares a not equal comparison.
     * @param obj {*} - The right operand of the expression
     * @returns {DataQueryable}
     */
    notEqual(obj) {
        this.query.notEqual(resolveValue.bind(this)(obj));
        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Prepares a greater than comparison.
     * @param obj {*} - The right operand of the expression
     * @returns {DataQueryable}
     */
    greaterThan(obj) {
        this.query.greaterThan(resolveValue.bind(this)(obj));
        return this;
    }
    /**
     * Prepares a greater than or equal comparison.
     * @param obj {*} The right operand of the expression
     * @returns {DataQueryable}
     */
    greaterOrEqual(obj) {
        this.query.greaterOrEqual(resolveValue.bind(this)(obj));
        return this;
    }
    /**
     * Prepares a bitwise and comparison.
     * @param {*} value - The right operand of the express
     * @param {Number=} result - The result of a bitwise and expression
     * @returns {DataQueryable}
     */
    bit(value, result) {
        if (_.isNil(result)) {
            this.query.bit(value, value);
        } else {
            this.query.bit(value, result);
        }
        return this;
    }
    /**
     * Prepares a lower than comparison
     * @param obj {*}
     * @returns {DataQueryable}
     */
    lowerThan(obj) {
        this.query.lowerThan(resolveValue.bind(this)(obj));
        return this;
    }
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
    lowerOrEqual(obj) {
        this.query.lowerOrEqual(resolveValue.bind(this)(obj));
        return this;
    }
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
    startsWith(obj) {
        this.query.startsWith(obj);
        return this;
    }
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
    endsWith(obj) {
        this.query.endsWith(obj);
        return this;
    }
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
    in(objs) {
        this.query.in(objs);
        return this;
    }
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
    notIn(objs) {
        this.query.notIn(objs);
        return this;
    }
    /**
     * Prepares a modular arithmetic operation
     * @param {*} obj The value to be compared
     * @param {Number} result The result of modular expression
     * @returns {DataQueryable}
     */
    mod(obj, result) {
        this.query.mod(obj, result);
        return this;
    }
    /**
     * Prepares a contains comparison (e.g. a string contains another string).
     * @param value {*} - The right operand of the expression
     * @returns {DataQueryable}
     */
    contains(value) {
        this.query.contains(value);
        return this;
    }
    /**
     * Prepares a not contains comparison (e.g. a string contains another string).
     * @param value {*} - The right operand of the expression
     * @returns {DataQueryable}
     */
    notContains(value) {
        this.query.notContains(value);
        return this;
    }
    /**
     * Prepares a comparison where the left operand is between two values
     * @param {*} value1 - The minimum value
     * @param {*} value2 - The maximum value
     * @returns {DataQueryable}
     */
    between(value1, value2) {
        this.query.between(resolveValue.bind(this)(value1), resolveValue.bind(this)(value2));
        return this;
    }
    /**
     * Selects a field or a collection of fields of the current model.
     * @param {...string} attr  An array of fields, a field or a view name
     * @returns {DataQueryable}
     */
    select(attr) {

        let self = this, arr, expr,
            arg = (arguments.length > 1) ? Array.prototype.slice.call(arguments) : attr;

        let field;
        if (typeof arg === 'string') {
            if (arg === '*') {
                //delete select
                delete self.query.$select;
                return this;
            }
            //validate field or model view
            field = self.model.field(arg);
            if (field) {
                //validate field
                if (field.many || (field.mapping && field.mapping.associationType === 'junction')) {
                    self.expand(field.name);
                } else {
                    arr = [];
                    arr.push(self.fieldOf(field.name));
                }
            } else {
                //get data view
                self.$view = self.model.dataviews(arg);
                //if data view was found
                if (self.$view) {
                    arr = [];
                    let name;
                    self.$view.fields.forEach(function (x) {
                        name = x.name;
                        field = self.model.field(name);
                        //if a field with the given name exists in target model
                        if (field) {
                            //check if this field has an association mapping
                            if (field.many || (field.mapping && field.mapping.associationType === 'junction')) {
                                self.expand(field.name);
                            } else {
                                arr.push(self.fieldOf(field.name));
                            }
                        } else {
                            let b = DataAttributeResolver.prototype.testAggregatedNestedAttribute.call(self, name);
                            if (b) {
                                expr = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, b.aggr, b.name);
                                if (expr) {
                                    arr.push(expr);
                                }
                            } else {
                                b = DataAttributeResolver.prototype.testNestedAttribute.call(self, name);
                                if (b) {
                                    expr = DataAttributeResolver.prototype.selectNestedAttribute.call(self, b.name, x.property);
                                    if (expr) {
                                        arr.push(expr);
                                    }
                                } else {
                                    b = DataAttributeResolver.prototype.testAttribute.call(self, name);
                                    if (b) {
                                        arr.push(self.fieldOf(b.name, x.property));
                                    } else if (/\./g.test(name)) {
                                        name = name.split('.')[0];
                                        arr.push(self.fieldOf(name));
                                    } else {
                                        arr.push(self.fieldOf(name));
                                    }
                                }
                            }
                        }
                    });
                } else {
                    //select a field from a joined entity
                    expr = select_.call(self, arg);
                    if (expr) {
                        arr = arr || [];
                        arr.push(expr);
                    }
                }
            }
            if (_.isArray(arr)) {
                if (arr.length === 0) {
                    arr = null;
                }
            }
        } else {
            //get array of attributes
            if (_.isArray(arg)) {
                arr = [];
                //check if field is a data view
                if (arg.length === 1 && typeof arg[0] === 'string') {
                    if (self.model.dataviews(arg[0])) {
                        return self.select(arg[0]);
                    }
                }
                arg.forEach(function (x) {
                    if (typeof x === 'string') {
                        field = self.model.field(x);
                        if (field) {
                            if (field.many || (field.mapping && field.mapping.associationType === 'junction')) {
                                self.expand({
                                    'name': field.name,
                                    'options': field.options
                                });
                            } else {
                                arr.push(self.fieldOf(field.name));
                            }
                        } else {
                            //test nested attribute and simple attribute expression
                            expr = select_.call(self, x);
                            if (expr) {
                                arr = arr || [];
                                arr.push(expr);
                            }
                        }
                    } else {
                        //validate if x is an object (QueryField)
                        arr.push(x);
                    }

                });
            }
        }
        if (_.isNil(arr)) {
            if (!self.query.hasFields()) {
                // //enumerate fields
                let fields = self.model.attributes.filter(function (x) {
                    return (x.many === false) || (_.isNil(x.many)) || ((x.expandable === true) && (self.getLevels() > 0));
                }).map(function (x) {
                    return x.property || x.name;
                });
                if (fields.length === 0) {
                    return this;
                }
                return self.select.apply(self, fields);
            }
        } else {
            self.query.select(arr);
        }

        return this;
    }
    // noinspection JSUnusedGlobalSymbols
    dateOf(attr) {
        if (typeof attr === 'undefined' || attr === null) {
            return attr;
        }
        if (typeof attr !== 'string') {
            return attr;
        }
        return this.fieldOf('date(' + attr + ')');
    }
    /**
     * @param attr {string|*}
     * @param alias {string=}
     * @returns {DataQueryable|QueryField|*}
     */
    fieldOf(attr, alias) {

        if (typeof attr === 'undefined' || attr === null) {
            return attr;
        }
        if (typeof attr !== 'string') {
            return attr;
        }
        let matches = /(count|avg|sum|min|max)\((.*?)\)/i.exec(attr), res, field, aggr, prop;
        if (matches) {
            //get field
            field = this.model.field(matches[2]);
            //get aggregate function
            aggr = matches[1].toLowerCase();
            //test nested attribute aggregation
            if (_.isNil(field) && /\//.test(matches[2])) {
                //resolve nested attribute
                let nestedAttr = DataAttributeResolver.prototype.resolveNestedAttribute.call(this, matches[2]);
                //if nested attribute exists
                if (nestedAttr) {
                    if (_.isNil(alias)) {
                        let nestedMatches = /as\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(attr);
                        alias = _.isNil(nestedMatches) ? aggr.concat('Of_', matches[2].replace(/\//g, '_')) : nestedMatches[1];
                    }
                    /**
                     * @type {Function}
                     */
                    let fn = QueryField[aggr];
                    //return query field
                    return fn(nestedAttr.$name).as(alias);
                }
            }
            if (field == null) {
                throw new DataError('E_FIELD', 'The specified field cannot be found in target model.', null, this.model.name, matches[2]);
            }
            if (_.isNil(alias)) {
                matches = /as\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(attr);
                if (matches) {
                    alias = matches[1];
                } else {
                    alias = aggr.concat('Of', field.name);
                }
            }
            if (aggr === 'count') {
                return QueryField.count(field.name).from(this.model.viewAdapter).as(alias);
            } else if (aggr === 'avg') {
                return QueryField.average(field.name).from(this.model.viewAdapter).as(alias);
            } else if (aggr === 'sum') {
                return QueryField.sum(field.name).from(this.model.viewAdapter).as(alias);
            } else if (aggr === 'min') {
                return QueryField.min(field.name).from(this.model.viewAdapter).as(alias);
            } else if (aggr === 'max') {
                return QueryField.max(field.name).from(this.model.viewAdapter).as(alias);
            }
        } else {
            matches = /(\w+)\((.*?)\)/i.exec(attr);
            if (matches) {
                res = {};
                field = this.model.field(matches[2]);
                aggr = matches[1];
                if (field == null) {
                    throw new DataError('E_FIELD', 'The specified field cannot be found in target model.', null, this.model.name, matches[2]);
                }
                if (_.isNil(alias)) {
                    matches = /as\s([\u0021-\u007F\u0080-\uFFFF]+)$/i.exec(attr);
                    if (matches) {
                        alias = matches[1];
                    }
                }
                prop = alias || field.property || field.name;
                res[prop] = {}; res[prop]['$' + aggr] = [QueryField.select(field.name).from(this.model.viewAdapter)];
                return res;
            } else {
                //matches expression [field] as [alias] e.g. itemType as type
                matches = /^(\w+)\s+as\s+(.*?)$/i.exec(attr);
                if (matches) {
                    field = this.model.field(matches[1]);
                    if (field == null) {
                        throw new DataError('E_FIELD', 'The specified field cannot be found in target model.', null, this.model.name, attr);
                    }
                    alias = matches[2];
                    prop = alias || field.property || field.name;
                    return QueryField.select(field.name).from(this.model.viewAdapter).as(prop);
                } else {
                    //try to match field with expression [field] as [alias] or [nested]/[field] as [alias]
                    field = this.model.field(attr);
                    if (field == null) {
                        throw new DataError('E_FIELD', 'The specified field cannot be found in target model.', null, this.model.name, attr);
                    }
                    let f = QueryField.select(field.name).from(this.model.viewAdapter);
                    if (alias) {
                        return f.as(alias);
                    } else if (field.property) {
                        return f.as(field.property);
                    }
                    return f;
                }
            }
        }
        return this;
    }
    /**
     * Prepares an ascending sorting operation
     * @param {string} attr - The field name to use for sorting results
     * @returns {DataQueryable}
     */
    orderBy(attr) {
        if (typeof attr === 'string' && /\//.test(attr)) {
            this.query.orderBy(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
            return this;
        }
        this.query.orderBy(this.fieldOf(attr));
        return this;
    }
    /**
     * Prepares a group by expression
     * @param {...string} attr - A param array of string that represents the attributes which are going to be used in group by expression
     * @returns {DataQueryable}
     * @example
     //retrieve products with highest sales during last month
     context.model('Order')
     .select('orderedItem/model as productModel', 'orderedItem/name as productName','count(id) as orderCount')
     .where('orderDate').greaterOrEqual(moment().startOf('month').toDate())
     .groupBy('orderedItem')
     .orderByDescending('count(id)')
     .take(5).list().then(function(result) {
            done(null, result);
        }).catch(function(err) {
            done(err);
        });
     @example //Results
     productModel  productName                              orderCount
     ------------  ---------------------------------------  ----------
     SM5111        Brother MFC-J6920DW                      3
     FY8135        LaCie Blade Runner                       3
     HA6910        Apple iMac (27-Inch, 2013 Version)       2
     LD4238        Dell XPS 18                              2
     HR6205        Samsung Galaxy Note 10.1 (2014 Edition)  2
     */
    groupBy(attr) {
        let arr = [],
            arg = (arguments.length > 1) ? Array.prototype.slice.call(arguments) : attr;
        if (_.isArray(arg)) {
            for (let i = 0; i < arg.length; i++) {
                let x = arg[i];
                if (DataAttributeResolver.prototype.testNestedAttribute.call(this, x)) {
                    //nested group by
                    arr.push(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, x));
                } else {
                    arr.push(this.fieldOf(x));
                }
            }
        } else {
            if (DataAttributeResolver.prototype.testNestedAttribute.call(this, arg)) {
                //nested group by
                arr.push(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, arg));
            } else {
                arr.push(this.fieldOf(arg));
            }
        }
        if (arr.length > 0) {
            this.query.groupBy(arr);
        }
        return this;
    }
    /**
     * Continues a ascending sorting operation
     * @param {string} attr - The field to use for sorting results
     * @returns {DataQueryable}
     */
    thenBy(attr) {
        if (typeof attr === 'string' && /\//.test(attr)) {
            this.query.thenBy(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
            return this;
        }
        this.query.thenBy(this.fieldOf(attr));
        return this;
    }
    /**
     * Prepares a descending sorting operation
     * @param {string} attr - The field name to use for sorting results
     * @returns {DataQueryable}
     */
    orderByDescending(attr) {
        if (typeof attr === 'string' && /\//.test(attr)) {
            this.query.orderByDescending(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
            return this;
        }
        this.query.orderByDescending(this.fieldOf(attr));
        return this;
    }
    /**
     * Continues a descending sorting operation
     * @param {string} attr The field name to use for sorting results
     * @returns {DataQueryable}
     */
    thenByDescending(attr) {
        if (typeof attr === 'string' && /\//.test(attr)) {
            this.query.thenByDescending(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
            return this;
        }
        this.query.thenByDescending(this.fieldOf(attr));
        return this;
    }
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
    first(callback) {
        const executeFunc = firstInternal.bind(this);
        if (typeof callback === 'undefined') {
            return new Promise(function(resolve, reject){
                return executeFunc(function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(result);
                });
            });
        } else {
            return executeFunc(callback);
        }
    }
    /**
     * Executes the specified query and returns all objects which satisfy the specified criteria.
     * @param {Function=} callback
     * @returns {Promise|*}
     */
    all(callback) {
        const executeFunc = allInternal.bind(this);
        if (typeof callback === 'undefined') {
            return new Promise(function(resolve, reject){
                return executeFunc(function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(result);
                });
            });
        }
        return executeFunc(callback);
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
    skip(n) {
        this.query.$skip = n;
        return this;
    }
    /**
     * Prepares a data paging operation by taking the specified number of records
     * @param {Number} n - The number of records to take
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result.
     * @returns {DataQueryable|*} - If callback function is missing returns a promise.
     */
    take(n, callback) {
        if (typeof callback !== 'function') {
            this.query.take(n);
            return this;
        } else {
            takeInternal.call(this, n, callback);
        }
    }
    /**
     * Executes current query and returns a result set based on the specified paging parameters.
     */
    list(callback) {
        const executeFunc = listInternal.bind(this);
        if (typeof callback === 'undefined') {
            return new Promise(function(resolve, reject) {
                return executeFunc(function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                });
            });
        }
        // otherwise call method with callback
        return listInternal.call(this, callback);
    }
    /**
     * Executes current query and returns a result set based on the specified paging parameters.
     * @returns {Promise|*}
     */
    getList() {
        return this.list();
    }
    /**
     * Executes the specified query and returns an array of objects which satisfy the specified criteria.
     * @returns {Promise|*}
     */
    getItems() {
        const thisArg = this;
        return new Promise(function(resolve, reject){
            delete thisArg.query.$inlinecount;
            if ((parseInt(thisArg.query.$take) || 0) < 0) {
                delete thisArg.query.$take;
                delete thisArg.query.$skip;
            }
            if (!thisArg.query.hasFields()) {
                thisArg.select();
            }
            execute_.call(thisArg, function (err, result) {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        });
    }
    /**
     * @param {string} name
     * @param {string=} alias
     * @returns {*|QueryField}
     */
    countOf(name, alias) {
        alias = alias || 'countOf'.concat(name);
        let res = this.fieldOf(`count(${name})`);
        if (alias != null) {
            res.as(alias);
        }
        return res;
    }
    /**
     * @param {string} name
     * @param {string=} alias
     * @returns {QueryField|*}
     */
    sumOf(name, alias) {
        alias = alias || 'sumOf'.concat(name);
        let res = this.fieldOf(`sum(${name})`);
        if (alias != null) {
            res.as(alias);
        }
        return res;
    }
    /**
     * Executes the query against the current model and returns the count of items found.
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result, if any.
     * @returns {Promise|*} - If callback parameter is missing then returns a Deferred object.
     */
    count(callback) {
        const executeFunc = countInternal.bind(this);
        if (typeof callback === 'undefined') {
            return new Promise(function (resolve, reject) {
                return executeFunc(function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(result);
                });
            });
        }
        return executeFunc(callback);
    }
    /**
     * Executes the query against the current model and returns the maximum value of the given attribute.
     * @param {string} attr - A string that represents a field of the current model
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result, if any.
     * @returns {Promise|*} - If callback parameter is missing then returns a Deferred object.
     */
    max(attr, callback) {
        const executeFunc = maxInternal.bind(this);
        if (typeof callback === 'undefined') {
            return new Promise(function(resolve, reject) {
                return executeFunc(attr, function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(result);
                });
            });
        }
        return executeFunc(attr, callback);
    }
    /**
     * Executes the query against the current model and returns the average value of the given attribute.
     * @param {string} attr - A string that represents a field of the current model
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result, if any.
     * @returns {Promise|*} - If callback parameter is missing then returns a Deferred object.
     */
    min(attr, callback) {
        const executeFunc = minInternal.bind(this);
        if (typeof callback === 'undefined') {
            return new Promise(function(resolve, reject) {
                return executeFunc(attr, function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(result);
                });
            });
        }
        return executeFunc(attr, callback);
    }
    /**
     * Executes the query against the current model and returns the average value of the given attribute.
     * @param {string} attr - A string that represents a field of the current model
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result, if any.
     * @returns {Deferred|*} - If callback parameter is missing then returns a Deferred object.
     */
    average(attr, callback) {
        const executeFunc = averageInternal_.bind(this);
        if (typeof callback === 'undefined') {
            return new Promise(function(resolve, reject) {
                return executeFunc(attr, function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(result);
                });
            });
        }
        return executeFunc(attr, callback);
    }
    /**
     * Migrates the underlying data model
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    migrate(callback) {
        let self = this;
        try {
            //ensure context
            self.ensureContext();
            if (self.model) {
                self.model.migrate(function (err) {
                    callback(err);
                });
            } else {
                callback();
            }
        } catch (e) {
            callback(e);
        }

    }
    // noinspection JSUnusedGlobalSymbols
    postExecute(result, callback) {
        callback();
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
    silent(value) {
        /**
         * @type {boolean}
         * @private
         */
        this.$silent = false;
        if (typeof value === 'undefined') {
            this.$silent = true;
        } else {
            this.$silent = value;
        }
        return this;
    }
    /**
     * Generates a MD5 hashed string for this DataQueryable instance
     * @returns {string}
     */
    toMD5() {
        return TextUtils.toMD5({
            query: this.query,
            $expand: this.$expand,
            $levels: this.$levels,
            $flatten: this.$flatten,
            $silent: this.$silent,
            $asArray: this.$asArray
        });
    }
    /**
     * @param {Boolean=} value
     * @returns {DataQueryable}
     */
    asArray(value) {
        /**
         * @type {boolean}
         * @private
         */
        this.$asArray = false;
        if (typeof value === 'undefined') {
            this.$asArray = true;
        } else {
            this.$asArray = value;
        }
        return this;
    }
    /**
     * Gets or sets query data. This data may be used in before and after execute listeners.
     * @param {string=} name
     * @param {*=} value
     * @returns {DataQueryable|*}
     */
    data(name, value) {
        this.query.data = this.query.data || {};
        if (typeof name === 'undefined') {
            return this.query.data;
        }
        if (typeof value === 'undefined') {
            return this.query.data[name];
        } else {
            this.query.data[name] = value;
        }
        return this;
    }
    /**
     * Gets or sets a string which represents the title of this DataQueryable instance. This title may be used in caching operations
     * @param {string=} value - The title of this DataQueryable instance
     * @returns {string|DataQueryable}
     */
    title(value) {
        return this.data('title', value);
    }
    /**
     * Gets or sets a boolean which indicates whether results should be cached or not. This parameter is valid for models which have caching mechanisms.
     * @param {boolean=} value
     * @returns {string|DataQueryable}
     */
    cache(value) {
        return this.data('cache', value);
    }
    /**
     * Sets an expandable field or collection of fields. An expandable field produces nested objects based on the association between two models.
     * @param {...string|*} attr - A param array of strings which represents the field or the array of fields that are going to be expanded.
     * If attr is missing then all the previously defined expandable fields will be removed.
     * @returns {DataQueryable}
     */
    expand(attr) {

        let self = this,
            arg = (arguments.length > 1) ? Array.prototype.slice.call(arguments) : [attr];
        let expanded;
        if (_.isNil(arg)) {
            delete self.$expand;
        } else {
            if (!_.isArray(this.$expand)) {
                self.$expand = [];
            }
            _.forEach(arg, function (x) {
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
                                let ix = self.$expand.indexOf(expanded);
                                self.$expand.splice(ix, 1);
                                //push expand as object with options
                                self.$expand.push(x);
                            } else if (typeof expanded === 'object') {
                                //ensure expand options
                                expanded.options = expanded.options || {};
                                //assign options to expand.options
                                _.assign(expanded.options, x.options);
                            }
                        }
                    } else {
                        self.$expand.push(x);
                    }
                } else {
                    throw new Error('Expand option may be a string or a named object.');
                }
            });
        }
        return self;
    }
    hasExpand(attr) {
        if (_.isNil(this.$expand)) {
            return false;
        }

        let expand = attr;
        if (typeof attr === 'string') {
            expand = attr;
        } else if (typeof attr.name === 'string') {
            expand = attr.name;
        }

        return _.find(this.$expand, function (x) {
            if (typeof x === 'string') {
                return x === expand;
            } else if (x instanceof DataAssociationMapping) {
                return x === expand;
            } else if (typeof x.name === 'string') {
                return x.name === expand;
            }
            return false;
        });
    }
    /**
     * Disables expandable fields
     * @param {boolean=} value - If the value is true the result will contain only flat objects -without any nested associated object-,
     * even if model definition contains expandable fields. If value is missing, the default parameter is true
     * @returns {DataQueryable}
     */
    flatten(value) {

        if (value || (typeof value === 'undefined')) {
            //delete expandable data (if any)
            delete this.$expand;
            this.$flatten = true;
        } else {
            delete this.$flatten;
        }
        if (this.$flatten) {
            this.$levels = 0;
        }
        return this;
    }
    /**
     * Prepares an addition (e.g. ([field] + 4))
     * @param {number|*} x - The
     * @returns {DataQueryable}
     */
    add(x) {
        this.query.add(x); return this;
    }
    /**
     * Prepares a subtraction (e.g. ([field] - 4))
     * @param {number|*} x
     * @returns {DataQueryable}
     */
    subtract(x) {
        this.query.subtract(x); return this;
    }
    /**
     * Prepares a multiplication (e.g. ([field] * 0.2))
     * @param {number} x
     * @returns {DataQueryable}
     */
    multiply(x) {
        this.query.multiply(x); return this;
    }
    /**
     * Prepares a division (e.g. ([field] / 0.2))
     * @param {number} x
     * @returns {DataQueryable}
     */
    divide(x) {
        this.query.divide(x); return this;
    }
    /**
     * * Prepares a round mathematical expression
     * @param {number=} n
     * @returns {DataQueryable}
     */
    round(n) {
        this.query.round(n); return this;
    }
    /**
     * Prepares a substring comparison
     * @param {number} start - The position where to start the extraction. First character is at index 0
     * @param {number=} length - The number of characters to extract
     * @returns {DataQueryable}
     */
    substr(start, length) {
        this.query.substr(start, length); return this;
    }
    /**
     * Prepares an indexOf comparison
     * @param {string} s The string to search for
     * @returns {DataQueryable}
     */
    indexOf(s) {
        this.query.indexOf(s); return this;
    }
    /**
     * Prepares a string concatenation expression
     * @param {string} s
     * @returns {DataQueryable}
     */
    concat(s) {
        this.query.concat(s); return this;
    }
    /**
     * Prepares a string trimming expression
     * @returns {DataQueryable}
     */
    trim() {
        this.query.trim(); return this;
    }
    /**
     * Prepares a string length expression
     * @returns {DataQueryable}
     */
    length() {
        this.query.length(); return this;
    }
    /**
     * Prepares an expression by getting the date only value of a datetime field
     * @returns {DataQueryable}
     */
    getDate() {
        this.query.getDate(); return this;
    }
    /**
     * Prepares an expression by getting the year of a datetime field
     * @returns {DataQueryable}
     */
    getYear() {
        this.query.getYear(); return this;
    }
    /**
     * Prepares an expression by getting the year of a datetime field
     * @returns {DataQueryable}
     */
    getFullYear() {
        this.query.getYear(); return this;
    }
    /**
     * Prepares an expression by getting the month (from 1 to 12) of a datetime field.
     * @returns {DataQueryable}
     */
    getMonth() {
        this.query.getMonth(); return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Prepares an expression by getting the day of the month of a datetime field
     * @returns {DataQueryable}
     */
    getDay() {
        this.query.getDay(); return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Prepares an expression by getting the hours (from 0 to 23) a datetime field
     * @returns {DataQueryable}
     */
    getHours() {
        this.query.getHours(); return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Prepares an expression by getting the minutes (from 0 to 59) a datetime field
     * @returns {DataQueryable}
     */
    getMinutes() {
        this.query.getMinutes(); return this;
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Prepares an expression by getting the seconds (from 0 to 59) a datetime field
     * @returns {DataQueryable}
     */
    getSeconds() {
        this.query.getSeconds(); return this;
    }
    /**
     * Prepares a floor mathematical expression
     * @returns {DataQueryable}
     */
    floor() {
        this.query.floor(); return this;
    }
    /**
     * Prepares a ceil mathematical expression
     * @returns {DataQueryable}
     */
    ceil() {
        this.query.ceil(); return this;
    }
    /**
     * Prepares a lower case string comparison
     * @returns {DataQueryable}
     */
    toLocaleLowerCase() {
        this.query.toLocaleLowerCase(); return this;
    }
    /**
     * Prepares a lower case string comparison
     * @returns {DataQueryable}
     */
    toLowerCase() {
        return this.toLocaleLowerCase();
    }
    /**
     * Prepares an upper case string comparison
     * @returns {DataQueryable}
     */
    toLocaleUpperCase() {
        this.query.toLocaleUpperCase(); return this;
    }
    /**
     * Prepares an upper case string comparison
     * @returns {DataQueryable}
     */
    toUpperCase() {
        return this.toLocaleUpperCase();
    }
    /**
     * Executes the underlying query and a single value.
     * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occurred, or null otherwise. The second argument will contain the result.
     * @returns {Promise|*}
     */
    value(callback) {
        const executeFunc = valueInternal.bind(this);
        if (typeof callback === 'undefined') {
            return new Promise(function(resolve, reject) {
                return executeFunc(function (err, result) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(result);
                });
            });
        }
        return executeFunc(callback);
    }
    /**
     * Sets the number of levels of the expandable attributes.
     * The default value is 1 which means that any expandable attribute will be flat (without any other nested attribute).
     * If the value is greater than 1 then the nested objects may contain other nested objects and so on.
     * @param {Number=} value - A number which represents the number of levels which are going to be used in expandable attributes.
     * @returns {DataQueryable}
     */
    levels(value) {
        /**
         * @type {number}
         * @private
         */
        this.$levels = 1;
        if (typeof value === 'undefined') {
            this.$levels = 1;
        } else if (typeof value === 'number') {
            this.$levels = value;
        }
        //set flatten property (backward compatibility issue)
        this.$flatten = (this.$levels < 1);
        return this;
    }
    /**
     * Gets the number of levels of the expandable objects
     * @returns {number}
     */
    getLevels() {
        if (typeof this.$levels === 'number') {
            return this.$levels;
        }
        return 1;
    }
    /**
     * Converts a DataQueryable instance to an object which is going to be used as parameter in DataQueryable.expand() method
     *  @param {String} attr - A string which represents the attribute of a model which is going to be expanded with the options specified in this instance of DataQueryable.
     */
    toExpand(attr) {
        if ((typeof attr === 'string') && (attr.length > 0)) {
            return {
                name: attr,
                options: this
            };
        }
        throw new Error('Invalid parameter. Expected not empty string.');
    }
    /**
     * Executes the specified query and returns the first object which satisfy the specified criteria.
     * @returns {Promise|*}
     */
    getItem() {
        return this.first();
    }
    /**
     * Gets an instance of DataObject by executing the defined query.
     * @returns {Promise|*}
     */
    getTypedItem() {
        let thisArg = this;
        return thisArg.first().then(function(result) {
            return thisArg.model.convert(result);
        });
    }
    /**
     * Gets a collection of DataObject instances by executing the defined query.
     * @returns {Promise|*}
     */
    getTypedItems() {
        const thisArg = this;
        return this.getItems().then(function(result) {
            return thisArg.model.convert(result);
        });
    }
    /**
     * Gets a result set that contains a collection of DataObject instances by executing the defined query.
     * @returns {Promise<ListResult>}
     */
    getTypedList() {
        const thisArg = this;
        return thisArg.list().then(function(result) {
            result.value = thisArg.model.convert(result.value.slice(0));
            return result;
        });
    }
    /**
     * Executes the specified query and returns all objects which satisfy the specified criteria.
     * @returns {Promise|*}
     */
    getAllItems() {
        return this.all();
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * Executes the specified query and returns all objects which satisfy the specified criteria.
     * @returns {Promise|*}
     */
    getAllTypedItems() {
        return this.skip(0).take(-1).getTypedItems();
    }
}

/**
 * @private
 * @memberof DataQueryable#
 * @param {*} obj
 * @returns {*}
 */
function resolveValue(obj) {
    let self = this;
    if (typeof obj === 'string' && /^\$it\//.test(obj)) {
        let attr = obj.replace(/^\$it\//, '');
        if (DataAttributeResolver.prototype.testNestedAttribute(attr)) {
            return DataAttributeResolver.prototype.resolveNestedAttribute.call(self, attr);
        } else {
            attr = DataAttributeResolver.prototype.testAttribute(attr);
            if (attr) {
                return self.fieldOf(attr.name);
            }
        }
    }
    return obj;
}

/**
 * @memberOf DataQueryable#
 * @param arg
 * @returns {*}
 * @private
 */
function select_(arg) {
    let self = this;
    if (typeof arg === 'string' && arg.length === 0) {
        return;
    }
    let a = DataAttributeResolver.prototype.testAggregatedNestedAttribute.call(self, arg);
    if (a) {
        return DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, a.aggr, a.name, a.property);
    } else {
        a = DataAttributeResolver.prototype.testNestedAttribute.call(self, arg);
        if (a) {
            return DataAttributeResolver.prototype.selectNestedAttribute.call(self, a.name, a.property);
        } else {
            a = DataAttributeResolver.prototype.testAttribute.call(self, arg);
            if (a) {
                return self.fieldOf(a.name, a.property);
            } else {
                return self.fieldOf(arg);
            }
        }
    }
}








/**
 * @private
 * @memberOf DataQueryable#
 * @param {Function} callback
 */
function firstInternal(callback) {
    let self = this;
    callback = callback || function () { };
    self.skip(0).take(1, function (err, result) {
        if (err) {
            callback(err);
        } else {
            if (result.length > 0) {
                callback(null, result[0]);
            } else {
                callback(null);
            }
        }
    });
}



/**
 * @private
 * @memberOf DataQueryable#
 * @param {Function} callback
 */
function allInternal(callback) {
    let self = this;
    //remove skip and take
    delete this.query.$skip;
    delete this.query.$take;
    //validate already selected fields
    if (!self.query.hasFields()) {
        self.select();
    }
    callback = callback || function () { };
    //execute select
    execute_.call(self, callback);
}


/**
 * @memberOf DataQueryable#
 * @private
 * @param {Number} n - Defines the number of items to take
 * @param {Function} callback
 * @returns {*} - A collection of objects that meet the query provided
 */
function takeInternal(n, callback) {
    let self = this;
    self.query.take(n);
    callback = callback || function () { };
    //validate already selected fields
    if (!self.query.hasFields()) {
        self.select();
    }
    //execute select
    execute_.call(self, callback);
}




/**
 * @private
 * @memberOf DataQueryable#
 * @param {Function} callback
 */
function listInternal(callback) {
    let self = this;
    try {
        callback = callback || function () { };
        //ensure take attribute
        let take = self.query.$take || 25;
        //ensure that fields are already selected (or select all)
        self.select();

        //take objects
        self.take(take, function (err, result) {
            if (err) {
                callback(err);
            } else {
                /**
                 * @type {DataQueryable|*}
                 */
                let q1 = self.clone();
                // get count of records
                q1.count(function (err, total) {
                    if (err) {
                        callback(err);
                    } else {
                        //and finally create result set
                        let res = { total: total, skip: parseInt(self.query.$skip) || 0, value: (result || []) };
                        callback(null, res);
                    }
                });
            }
        });
    } catch (e) {
        callback(e);
    }
}



/**
 * @this DataQueryable
 * @private
 * @param callback {Function}
 * @returns {*} - A collection of objects that meet the query provided
 */
function countInternal(callback) {
    let self = this;
    callback = callback || function () { };
    //clone query
    let cloned = self.clone();
    cloned.query.count('__count__');
    if (cloned.query.hasFields() === false) {
        cloned.select();
    }
    if (hasOwnProperty(cloned.query, '$order')) {
        delete cloned.query.$order;
    }
    return execute_.bind(cloned)(function (err, result) {
        if (err) {
            return callback(err);
        }
        let value = null;
        if (_.isArray(result)) {
            //get first value
            if (result.length > 0) {
                value = result[0]['__count__'];
            }
        }
        return callback(null, value);
    });
}


/**
 * @private
 * @memberOf DataQueryable#
 * @param {string} attr
 * @param {Function} callback
 */
function maxInternal(attr, callback) {
    let self = this;
    delete self.query.$skip;
    let field = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, 'max', attr);
    self.select(field).flatten().value(function (err, result) {
        if (err) {
            return callback(err);
        }
        callback(null, result)
    });
}


/**
 * @private
 * @memberOf DataQueryable#
 * @param {string} attr
 * @param {Function} callback
 */
function minInternal(attr, callback) {
    let self = this;
    delete self.query.$skip;
    let field = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, 'min', attr);
    self.select(field).flatten().value(function (err, result) {
        if (err) {
            return callback(err);
        }
        callback(null, result)
    });
}


/**
 * @private
 * @memberOf DataQueryable#
 * @param {string} attr
 * @param {Function} callback
 */
function averageInternal_(attr, callback) {
    let self = this;
    delete self.query.$skip;
    let field = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, 'avg', attr);
    self.select(field).flatten().value(function (err, result) {
        if (err) {
            return callback(err);
        }
        callback(null, result)
    });
}


/**
 * Executes the underlying query statement.
 * @this DataQueryable
 * @param {Function} callback
 * @private
 */
function execute_(callback) {
    let self = this;
    self.migrate(function (err) {
        if (err) {
            callback(err); return;
        }
        let event;
        try {
            event = { model: self.model, query: self.query, type: 'select' };
            let flatten = self.$flatten || (self.getLevels() === 0);
            if (!flatten) {
                //get expandable fields
                let expandables = self.model.attributes.filter(function (x) {
                    return x.expandable;
                });
                //get selected fields
                let selected = self.query.$select[self.model.viewAdapter];
                if (_.isArray(selected)) {
                    //remove hidden fields
                    let hiddens = self.model.attributes.filter(function (x) {
                        return x.hidden;
                    });
                    if (hiddens.length > 0) {
                        let x;
                        for (let i = 0; i < selected.length; i++) {
                            /**
                             * @type {QueryField}
                             */
                            x = selected[i] instanceof QueryField ? selected[i] : new QueryField(selected[i]);
                            let hiddenField = hiddens.find(function (y) {
                                return x.getName() === y.name;
                            });
                            if (hiddenField) {
                                selected.splice(i, 1);
                                i -= 1;
                            }
                        }
                    }
                    //expand fields
                    if (expandables.length > 0) {
                        selected.forEach(function (x) {
                            //get field
                            let field = expandables.find(function (y) {
                                let f = x instanceof QueryField ? x : new QueryField(x);
                                return f.getName() === y.name;
                            });
                            //add expandable models
                            if (field) {
                                let mapping = self.model.inferMapping(field.name);
                                if (mapping) {
                                    self.$expand = self.$expand || [];
                                    let expand1 = self.$expand.find(function (x) {
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
        } catch (err) {
            return callback(err);
        }

        //merge view filter. if any
        if (self.$view) {
            return self.model.filter({ $filter: self.$view.filter, $order: self.$view.order, $group: self.$view.group }, function (err, q) {
                if (err) {
                    if (err) {
                        callback(err);
                    }
                } else {
                    //prepare current filter
                    if (q.query.$prepared) {
                        if (event.query.$where) {
                            event.query.prepare();
                        }
                        event.query.$where = q.query.$prepared;
                    }
                    if (q.query.$group) {
                        //replace group fields
                        event.query.$group = q.query.$group;
                    }
                    //add order fields
                    if (q.query.$order) {
                        if (_.isArray(event.query.$order)) {
                            q.query.$order.forEach(function (x) {
                                event.query.$order.push(x);
                            });
                        } else {
                            event.query.$order = q.query.$order;
                        }
                    }
                    //execute query
                    return finalExecuteInternal_.call(self, event, callback);
                }
            });
        } else {
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
    let self = this, context = self.ensureContext();
    //pass data queryable to event
    event.emitter = this;
    let afterListenerCount = self.model.listeners('after.execute').length;
    self.model.emit('before.execute', event, function (err) {
        if (err) {
            callback(err);
        } else {
            //if command has been completed, do not execute the command against the underlying database
            if (typeof event['result'] !== 'undefined') {
                //call after execute
                let result = event['result'];
                return afterExecute_.call(self, result, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    if (afterListenerCount === 0) {
                        return callback(null, result);
                    }
                    //raise after execute event
                    self.model.emit('after.execute', event, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, result);
                    });
                });
            }
            context.db.execute(event.query, null, function (err, result) {
                if (err) {
                    return callback(err);
                }
                afterExecute_.call(self, result, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    if (afterListenerCount === 0) {
                        return callback(null, result);
                    }
                    //raise after execute event
                    event.result = result;
                    self.model.emit('after.execute', event, function (err) {
                        if (err) {
                            return callback(err);
                        }
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
    let self = this;
    let field;
    if (self.query.$count) {
        return callback(null, result);
    }
    if (self.$expand) {
        //get distinct values

        let expands = _.intersectionBy(_.reverse(self.$expand), function (x) {
            if (typeof x === 'string') {
                return x;
            } else if (x instanceof DataAssociationMapping) {
                return x;
            } else if (typeof x.name === 'string') {
                return x.name;
            }
            return x;
        });

        //expands = self.$expand.distinct(function(x) { return x; });
        async.eachSeries(expands, function (expand, cb) {
            /**
             *
             * @type {DataAssociationMapping}
             */
            let mapping = null;
            let options = {};
            try {
                if (expand instanceof DataAssociationMapping) {
                    mapping = expand;
                    if (typeof expand.select !== 'undefined' && expand.select !== null) {
                        if (typeof expand.select === 'string') {
                            options['$select'] = expand.select;
                        } else if (_.isArray(expand.select)) {
                            options['$select'] = expand.select.join(',');
                        }
                    }
                    //get expand options
                    if (typeof expand.options !== 'undefined' && expand.options !== null) {
                        _.assign(options, expand.options);
                    }
                } else {
                    //get mapping from expand attribute
                    let expandAttr;
                    if (typeof expand === 'string') {
                        //get expand attribute as string
                        expandAttr = expand;
                    } else if ((typeof expand === 'object') && hasOwnProperty(expand, 'name')) {
                        //get expand attribute from Object.name property
                        expandAttr = expand.name;
                        //get expand options
                        if (typeof expand.options !== 'undefined' && expand.options !== null) {
                            options = expand.options;
                        }
                    } else {
                        //invalid expand parameter
                        return callback(new Error('Invalid expand option. Expected string or a named object.'));
                    }
                    field = self.model.field(expandAttr);
                    if (typeof field === 'undefined') {
                        field = self.model.attributes.find(function (x) {
                            return x.type === expandAttr
                        });
                    }
                    if (field) {
                        mapping = self.model.inferMapping(field.name);
                        if (expands.find(function (x) {
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
                            } else if (_.isArray(mapping.select) && mapping.select.length > 0) {
                                options['$select'] = mapping.select.join(',');
                            }
                            // check data view attribute mapping options
                            if (self.$view) {
                                // get view field
                                let re = new RegExp('^' + expand.name + '$', 'ig');
                                let viewField = self.$view.fields.find(function (x) {
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
                } else {
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
            } catch (e) {
                return cb(e);
            }

            if (mapping) {
                //clone mapping
                let thisMapping = _.assign({}, mapping);
                thisMapping.options = options;
                if (mapping.associationType === 'association' || mapping.associationType === 'junction') {
                    if ((mapping.parentModel === self.model.name) && (mapping.associationType === 'association')) {
                        return DataMappingExtensions.extend(thisMapping).for(self).getAssociatedChildren(result)
                            .then(function () {
                                return cb();
                            }).catch(function (err) {
                                return cb(err);
                            });
                    } else if (mapping.childModel === self.model.name && mapping.associationType === 'junction') {
                        return DataMappingExtensions.extend(thisMapping).for(self).getParents(result)
                            .then(function () {
                                return cb();
                            }).catch(function (err) {
                                return cb(err);
                            });
                    } else if (mapping.parentModel === self.model.name && mapping.associationType === 'junction') {
                        return DataMappingExtensions.extend(thisMapping).for(self).getChildren(result)
                            .then(function () {
                                return cb();
                            }).catch(function (err) {
                                return cb(err);
                            });
                    } else if ((mapping.childModel === self.model.name) && (mapping.associationType === 'association')) {
                        return DataMappingExtensions.extend(thisMapping).for(self).getAssociatedParents(result)
                            .then(function () {
                                return cb();
                            }).catch(function (err) {
                                return cb(err);
                            });
                    }
                } else {
                    return cb(new Error('Not yet implemented'));
                }
            } else {
                const err1 = new DataError('E_ASSOCIATION', 'Data association mapping cannot be found or the association between these two models is defined more than once', null, self.model.name);
                Object.assign(err1, {
                    association: expand
                });
                return cb(err1);
            }
        }, function (err) {
            if (err) {
                callback(err);
            } else {
                toArrayCallback.call(self, result, callback);
            }
        });
    } else {
        toArrayCallback.call(self, result, callback);
    }
}

/**
 * @private
 * @memberOf DataQueryable#
 * @param {Array|*} result
 * @param {Function} callback
 */
function toArrayCallback(result, callback) {
    try {
        let self = this;
        if (self.$asArray) {
            if (typeof self.query === 'undefined') {
                return callback(null, result);
            }
            let fields = self.query.fields();
            if (_.isArray(fields) === false) {
                return callback(null, result);
            }
            if (fields.length === 1) {
                let arr = [];
                result.forEach(function (x) {
                    if (_.isNil(x)) {
                        return;
                    }
                    let key = Object.keys(x)[0];
                    if (x[key]) {
                        arr.push(x[key]);
                    }
                });
                return callback(null, arr);
            } else {
                return callback(null, result);
            }
        } else {
            return callback(null, result);
        }
    } catch (e) {
        return callback(e);
    }
}










/**
 * @private
 * @memberOf DataQueryable#
 * @param {Function} callback
 */
function valueInternal(callback) {
    if (_.isNil(this.query.$select)) {
        this.select(this.model.primaryKey);
    }
    firstInternal.call(this, function (err, result) {
        if (err) {
            return callback(err);
        }
        if (_.isNil(result)) {
            return callback();
        }
        let key = Object.keys(result)[0];
        if (typeof key === 'undefined') {
            return callback();
        }
        callback(null, result[key]);
    });
}

module.exports = {
    DataQueryable,
    DataAttributeResolver
};

var {QueryField, QueryEntity, QueryUtils, MethodCallExpression, MemberExpression, ObjectNameValidator} = require('@themost/query');
var {sprintf} = require('sprintf-js');
var _ = require('lodash');
var {DataError} = require('@themost/common');
var Symbol = require('symbol');
var {hasOwnProperty} = require('./has-own-property');
var aliasProperty = Symbol('alias');
/**
 * @class
 * @constructor
 */
function DataAttributeResolver() {

}

DataAttributeResolver.prototype.orderByNestedAttribute = function(attr) {
    var nestedAttribute = new DataAttributeResolver().testNestedAttribute(attr);
    if (nestedAttribute) {
        var matches = /^(\w+)\((\w+)\/(\w+)\)$/i.exec(nestedAttribute.name);
        if (matches)   {
            return new DataAttributeResolver().selectAggregatedAttribute.call(this, matches[1], matches[2] + '/' + matches[3]);
        }
        matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)$/i.exec(nestedAttribute.name);
        if (matches)   {
            return new DataAttributeResolver().selectAggregatedAttribute.call(this, matches[1], matches[2] + '/' + matches[3] + '/' + matches[4]);
        }
    }
    return new DataAttributeResolver().resolveNestedAttribute.call(this, attr);
};

DataAttributeResolver.prototype.selectNestedAttribute = function(attr, alias) {
    var expr = new DataAttributeResolver().resolveNestedAttribute.call(this, attr);
    if (expr) {
        if (_.isNil(alias))
            expr.as(attr.replace(/\//g,'_'));
        else
            expr.as(alias)
    }
    return expr;
};
/**
 * @param {string} aggregation
 * @param {string} attribute
 * @param {string=} alias
 * @returns {*}
 */
DataAttributeResolver.prototype.selectAggregatedAttribute = function(aggregation, attribute, alias) {
    var self=this, result;
    if (new DataAttributeResolver().testNestedAttribute(attribute)) {
        result = new DataAttributeResolver().selectNestedAttribute.call(self,attribute, alias);
    }
    else {
        result = self.fieldOf(attribute);
    }
    var sAlias = result.as(), name = result.getName(), expr;
    if (sAlias) {
        expr = result[sAlias];
        result[sAlias] = { };
        result[sAlias]['$' + aggregation ] = expr;
    }
    else {
        expr = result.$name;
        result[name] = { };
        result[name]['$' + aggregation ] = expr;
    }
    return result;
};

DataAttributeResolver.prototype.resolveNestedAttribute = function(attr) {
    var self = this;
    if (typeof attr === 'string' && /\//.test(attr)) {
        var member = attr.split('/'), expr, arr, obj, select;
        //change: 18-Feb 2016
        //description: Support many to many (junction) resolving
        var mapping = self.model.inferMapping(member[0]);
        if (mapping && mapping.associationType === 'junction') {
            var expr1 = new DataAttributeResolver().resolveJunctionAttributeJoin.call(self.model, attr);
            //select field
            select = expr1.$select;
            //get expand
            expr = {
                $expand: expr1.$expand
            };
        }
        else {
            // create member expression
            var memberExpr = {
                name: attr
            };
            // and pass member expression
            expr = new DataAttributeResolver().resolveNestedAttributeJoin.call(self.model, memberExpr);
            // if expr.$select is an instance of Expression then return it
            // important note: this operation is very important in cases where a json object is selected
            if (expr && expr.$select && Object.prototype.hasOwnProperty.call(expr.$select, '$value')) {
                var {$value} = expr.$select;
                select = new QueryField({
                    $value
                });
            } else {
                //select field
                if (member.length>2) {
                    if (memberExpr.name !== attr) {
                        // get member segments again because they have been modified
                        member = memberExpr.name.split('/');
                    }
                    select = QueryField.select(member[member.length-1]).from(member[member.length-2]);
                }
                else {
                    if (memberExpr.name !== attr) {
                        // get member segments again because they have been modified
                        member = memberExpr.name.split('/');
                    }
                    // if attribute has been resolved by the previous attribute resolver (for join)
                    // use the returned value which is also a query field expression
                    //
                    // important note: this operation is very important in cases where
                    // we are trying to select or filter zero-or-one associated items that are 
                    // defined by an association of type junction (a typical many-to-many association)
                    // e.g. $select=orderedItem/madeId as madeInCountry&$filter=orderedItem/madeId ne null
                    // where Product.madeId is a zero-or-one associated country with a product 
                    if (expr && expr.$select) {
                        select = expr.$select;
                    } else {
                        // otherwise build query field expression
                        select  = QueryField.select(member[1]).from(member[0]);
                    }
                }
            }
        }
        if (expr && expr.$expand) {
            if (_.isNil(self.query.$expand)) {
                self.query.$expand = expr.$expand;
            }
            else {
                arr = [];
                if (!Array.isArray(self.query.$expand)) {
                    arr.push(self.query.$expand);
                    this.query.$expand = arr;
                }
                arr = [];
                if (Array.isArray(expr.$expand))
                    arr.push.apply(arr, expr.$expand);
                else
                    arr.push(expr.$expand);
                arr.forEach(function(y) {
                    obj = self.query.$expand.find(function(x) {
                        if (x.$entity && x.$entity.$as) {
                                return (x.$entity.$as === y.$entity.$as);
                            }
                        return false;
                    });
                    if (typeof obj === 'undefined') {
                        self.query.$expand.push(y);
                    }
                });
            }
            return select;
        }
        else {
            throw new Error('Member join expression cannot be empty at this context');
        }
    }
};


/**
 *
 * @param {*} memberExpr - A string that represents a member expression e.g. user/id or article/published etc.
 * @returns {{$select?:QueryField,$expand?:{QueryEntity}[],$distinct?:boolean}} - An object that represents a query join expression
 */
DataAttributeResolver.prototype.resolveNestedAttributeJoin = function(memberExpr) {
    var self = this, childField, parentField, res, expr, entity;
    var memberExprString;
    if (typeof memberExpr === 'string') {
        memberExprString = memberExpr;
    }
    else if (typeof memberExpr === 'object' && hasOwnProperty(memberExpr, 'name')) {
        memberExprString = memberExpr.name
    }
    if (/\//.test(memberExprString)) {
        //if the specified member contains '/' e.g. user/name then prepare join
        var arrMember = memberExprString.split('/');
        var attrMember = self.field(arrMember[0]);
        if (_.isNil(attrMember)) {
            throw new Error(sprintf('The target model does not have an attribute named as %s',arrMember[0]));
        }
        //search for field mapping
        var mapping = self.inferMapping(arrMember[0]);
        if (_.isNil(mapping)) {
            // add support for json objects
            if (attrMember.type === 'Json') {
                var collection = self[aliasProperty] || self.viewAdapter;
                var objectPath = arrMember.join('.');
                var objectGet = new MethodCallExpression('jsonGet', [
                    new MemberExpression(collection + '.' + objectPath)
                ]);
                return {
                    $select: new QueryField({
                        $value: objectGet.exprOf()
                    }),
                    $expand: []
                }
            }
            throw new Error(sprintf('The target model does not have an association defined for attribute named %s',arrMember[0]));
        }
        if (mapping.childModel===self.name && mapping.associationType==='association') {
            //get parent model
            var parentModel = self.context.model(mapping.parentModel);
            if (_.isNil(parentModel)) {
                throw new Error(sprintf('Association parent model (%s) cannot be found.', mapping.parentModel));
            }
            childField = self.field(mapping.childField);
            if (_.isNil(childField)) {
                throw new Error(sprintf('Association field (%s) cannot be found.', mapping.childField));
            }
            parentField = parentModel.field(mapping.parentField);
            if (_.isNil(parentField)) {
                throw new Error(sprintf('Referenced field (%s) cannot be found.', mapping.parentField));
            }
            // get childField.name or childField.property
            var childFieldName = childField.property || childField.name;
            /**
             * store temp query expression
             * @type {import('@themost/query').QueryExpression}
             */
            res =QueryUtils.query(self.viewAdapter).select(['*']);
            expr = QueryUtils.query().where(QueryField.select(childField.name)
                .from(self[aliasProperty] || self.viewAdapter))
                .equal(QueryField.select(mapping.parentField).from(childFieldName));
            entity = new QueryEntity(parentModel.viewAdapter).as(childFieldName).left();
            res.join(entity).with(expr);
            Object.defineProperty(entity, 'model', {
                configurable: true,
                enumerable: false,
                writable: true,
                value: parentModel.name
            });
            if (arrMember.length>2) {
                parentModel[aliasProperty] = mapping.childField;
                expr = new DataAttributeResolver().resolveNestedAttributeJoin.call(parentModel, arrMember.slice(1).join('/'));
                return {
                    $distinct: expr.$distinct,
                    $select: expr.$select,
                    $expand: [].concat(res.$expand).concat(expr.$expand)
                };
            } else if (arrMember.length === 2) {
                // try to find if the nested member is an association of type junction
                var nestedMember = arrMember[1];
                /**
                 * @type {import("./types").DataAssociationMapping}
                 */
                var nestedMapping = parentModel.inferMapping(nestedMember);
                if (nestedMapping && nestedMapping.associationType === 'junction') {
                    // resolve nested member
                    parentModel[aliasProperty] = mapping.childField;
                    expr = new DataAttributeResolver().resolveJunctionAttributeJoin.call(parentModel, nestedMember);
                    return {
                        $select: expr.$select,
                        $expand: [].concat(res.$expand).concat(expr.$expand)
                    };
                }
            }
            return {
                $expand: res.$expand
            };
        }
        else if (mapping.parentModel===self.name && mapping.associationType==='association') {
            var $distinct = false;
            if (attrMember.multiplicity !== 'ZeroOrOne') {
                $distinct = true;
            }
            var childModel = self.context.model(mapping.childModel);
            if (_.isNil(childModel)) {
                throw new Error(sprintf('Association child model (%s) cannot be found.', mapping.childModel));
            }
            childField = childModel.field(mapping.childField);
            if (_.isNil(childField)) {
                throw new Error(sprintf('Association field (%s) cannot be found.', mapping.childField));
            }
            parentField = self.field(mapping.parentField);
            if (_.isNil(parentField)) {
                throw new Error(sprintf('Referenced field (%s) cannot be found.', mapping.parentField));
            }
            // get parent entity name for this expression
            var parentEntity = self[aliasProperty] || self.viewAdapter;
            // get child entity name for this expression
            var childEntity = arrMember[0];
            res =QueryUtils.query('Unknown').select(['*']);
            expr = QueryUtils.query().where(QueryField.select(parentField.name).from(parentEntity)).equal(QueryField.select(childField.name).from(childEntity));
            entity = new QueryEntity(childModel.viewAdapter).as(childEntity).left();
            res.join(entity).with(expr);
            Object.defineProperty(entity, 'model', {
                configurable: true,
                enumerable: false,
                writable: true,
                value: childModel.name
            });
            if (arrMember.length>2) {
                // set joined entity alias
                childModel[aliasProperty] = childEntity;
                // resolve additional joins
                expr = new DataAttributeResolver().resolveNestedAttributeJoin.call(childModel, arrMember.slice(1).join('/'));
                // concat and return joins
                return {
                    $distinct,
                    $select: expr.$select,
                    $expand: [].concat(res.$expand).concat(expr.$expand)
                };
            } else {
                // get child model member
                var childMember = childModel.field(arrMember[1]);
                if (childMember) {
                    // try to validate if child member has an alias or not
                    if (childMember.name !== arrMember[1]) {
                        arrMember[1] = childMember.name;
                        // set memberExpr
                        if (typeof memberExpr === 'object' && Object.prototype.hasOwnProperty.call(memberExpr, 'name')) {
                            memberExpr.name = arrMember.join('/');
                        }
                    }
                }
            }
            return {
                $distinct,
                $expand: res.$expand
            };
        }
        else {
            if (mapping.associationType === 'junction' && mapping.parentModel === self.name) {
                return new DataAttributeResolver().resolveJunctionAttributeJoin.call(self, memberExpr);
            } else {
                throw new Error(sprintf('The association type between %s and %s model is not supported for filtering, grouping or sorting data.', mapping.parentModel , mapping.childModel));
            }
        }
    }
};

/**
 * @param {string} s
 * @returns {*}
 */
DataAttributeResolver.prototype.testAttribute = function(s) {
    if (typeof s !== 'string')
        return null;
    /**
     * @private
     */
    var matches;
    /**
     * attribute aggregate function with alias e.g. f(x) as a
     * @ignore
     */
    matches = /^(\w+)\((\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + ')' , property:matches[3] };
    }
    /**
     * attribute aggregate function with alias e.g. x as a
     * @ignore
     */
    matches = /^(\w+)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] , property:matches[2] };
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
        return { name: s};
    }
};

/**
 * @param {string} s
 * @returns {*}
 */
DataAttributeResolver.prototype.testAggregatedNestedAttribute = function(s) {
    if (typeof s !== 'string')
        return null;
    /**
     * @private
     */
    var matches;
    /**
     * nested attribute aggregate function with alias e.g. f(x/b) as a
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
    if (matches) {
        return { aggr: matches[1], name: matches[2] + '/' + matches[3], property:matches[4] };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b/c) as a
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
    if (matches) {
        return { aggr: matches[1], name: matches[2] + '/' + matches[3] + '/' + matches[4], property:matches[5] };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b)
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\)$/i.exec(s);
    if (matches) {
        return { aggr: matches[1], name: matches[2] + '/' + matches[3]  };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b/c)
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)$/i.exec(s);
    if (matches) {
        return { aggr: matches[1], name: matches[2] + '/' + matches[3] + '/' + matches[4] };
    }
};

/**
 * @param {string} s
 * @returns {{name: string, property?: string}|null}
 */
DataAttributeResolver.prototype.testNestedAttribute = function(s) {
    if (typeof s !== 'string')
        return null;
    var matches;

    var pattern = (ObjectNameValidator.validator && ObjectNameValidator.validator.pattern) || new RegExp(ObjectNameValidator.Patterns.Default);
    var exprFuncWithAlias = new RegExp('^(\\w+)\\((\\w+(?:\\/\\w+)+)\\)(?:\\s+as\\s+' + pattern.source + ')?$');
    matches = exprFuncWithAlias.exec(s);
    if (matches) {
        // matches[1]: the function name
        // matches[2]: the nested attribute
        // matches[3]: the alias (optional)
        return { name: matches[2], property: matches[3] };
    }

    var exprWithAlias = new RegExp('^(\\w+(?:\\/\\w+)+)(\\s+as\\s+' + pattern.source + ')?$')
    /**
     * nested attribute with alias e.g. a/b/../c as a
     */
    matches = exprWithAlias.exec(s);
    if (matches) {
        // matches[2]: the nested attribute
        // matches[3]: the alias (optional)
        return { name: matches[1], property: matches[3] };
    }
};

/**
 * @param {string} attr
 * @returns {{$select?:QueryField,$expand?:{QueryEntity}[],$distinct?:boolean}}
 */
DataAttributeResolver.prototype.resolveJunctionAttributeJoin = function(attr) {
    var self = this, member = attr.split('/');
    var $distinct = false;
    //get the data association mapping
    var mapping = self.inferMapping(member[0]);
    //if mapping defines a junction between two models
    if (mapping && mapping.associationType === 'junction') {
        //get field
        var field = self.field(member[0]), entity, expr, q;
        var thisAlias = self[aliasProperty] || self.viewAdapter;
        //first approach (default association adapter)
        //the underlying model is the parent model e.g. Group > Group Members
        if (mapping.parentModel === self.name) {
            var associationAlias = mapping.associationAdapter;
            q =QueryUtils.query(self.viewAdapter).select(['*']);
            //init an entity based on association adapter (e.g. GroupMembers as members)
            entity = new QueryEntity(mapping.associationAdapter).as(associationAlias);
            if (field.multiplicity === 'ZeroOrOne') {
                entity.$join = 'left';
            } else {
                $distinct = true;
            }
            Object.defineProperty(entity, 'model', {
                configurable: true,
                enumerable: false,
                writable: true,
                value: mapping.associationAdapter
            });
            //init join expression between association adapter and current data model
            //e.g. Group.id = GroupMembers.parent
            expr = QueryUtils.query().where(QueryField.select(mapping.parentField).from(thisAlias))
                    .equal(QueryField.select(mapping.associationObjectField).from(associationAlias));
            //append join
            q.join(entity).with(expr);
            //data object tagging
            if (typeof mapping.childModel === 'undefined') {
                // check if field value
                if (field.type === 'Json') {
                    var objectPath = [
                        associationAlias,
                        mapping.associationValueField,
                        ...member.slice(1)
                    ].join('.');
                    var objectGet = new MethodCallExpression('jsonGet', [
                        new MemberExpression(objectPath)
                    ]);
                    return {
                        $distinct,
                        $select: new QueryField({
                            $value: objectGet.exprOf()
                        }),
                        $expand: [q.$expand]
                    }
                }
                return {
                    $distinct,
                    $expand:[q.$expand],
                    $select:QueryField.select(mapping.associationValueField).from(associationAlias)
                }
            }

            //return the resolved attribute for further processing e.g. members.id
            // if (member[1] === mapping.childField) {
            //     return {
            //         $expand:[q.$expand],
            //         $select:QueryField.select(mapping.associationValueField).from(associationAlias)
            //     }
            // }
            // else {
                //get child model
                var childModel = self.context.model(mapping.childModel);
                if (_.isNil(childModel)) {
                    throw new DataError('EJUNC','The associated model cannot be found.');
                }
                //create new join
                var alias = field.name; // + '_' + childModel.name;
                entity = new QueryEntity(childModel.viewAdapter).as(alias);

                if (field.multiplicity === 'ZeroOrOne') {
                    entity.$join = 'left';
                } else {
                    // issue #226: enable getting distinct values
                    $distinct = true;
                }
                // set model
                Object.defineProperty(entity, 'model', {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: childModel.name
                });
                expr = QueryUtils.query().where(QueryField.select(mapping.associationValueField).from(associationAlias))
                    .equal(QueryField.select(mapping.childField).from(alias));
                //append join
                q.join(entity).with(expr);
                return {
                    $distinct,
                    $expand:q.$expand,
                    $select:QueryField.select(member[1] || mapping.childField).from(alias)
                }
            //}
        }
        else {
            q =QueryUtils.query(self.viewAdapter).select(['*']);
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
                    $expand:[q.$expand],
                    $select:QueryField.select(mapping.associationObjectField).from(field.name)
                }
            }
            else {
                //get parent model
                var parentModel = self.context.model(mapping.parentModel);
                if (_.isNil(parentModel)) {
                    throw new DataError('EJUNC','The associated model cannot be found.');
                }
                //create new join
                var parentAlias = field.name + '_' + parentModel.name;
                entity = new QueryEntity(parentModel.viewAdapter).as(parentAlias);
                Object.defineProperty(entity, 'model', {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: parentModel.name
                });
                expr = QueryUtils.query().where(QueryField.select(mapping.associationObjectField).from(field.name))
                    .equal(QueryField.select(mapping.parentField).from(parentAlias));
                //append join
                q.join(entity).with(expr);
                return {
                    $distinct: true,
                    $expand:q.$expand,
                    $select:QueryField.select(member[1]).from(parentAlias)
                }
            }
        }
    }
    else {
        throw new DataError('EJUNC','The target model does not have a many to many association defined by the given attribute.','', self.name, attr);
    }
};
/**
 * @this 
 * @param {*} attr 
 */
DataAttributeResolver.prototype.resolveZeroOrOneNestedAttribute = function(attr) {
    /**
     * @type {import('./data-queryable').DataQueryable}
     */
    var self = this;
    var fullyQualifiedMember  = attr.split('/');
    var index = 0;
    var currentModel = self.model;
    while (index < fullyQualifiedMember.length) {
        var member = fullyQualifiedMember[index];
        var attribute = currentModel.getAttribute(member);
        if (attribute.multiplicity !== 'ZeroOrOne') {
            // do nothing
        }
    }
}

module.exports = {
    DataAttributeResolver
}

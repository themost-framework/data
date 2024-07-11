var {sprintf} = require('sprintf-js');
var Symbol = require('symbol');
var _ = require('lodash');
var {DataError} = require('@themost/common');
var {QueryField} = require('@themost/query');
var {QueryEntity} = require('@themost/query');
var {QueryUtils} = require('@themost/query');
var aliasProperty = Symbol('alias');
var {hasOwnProperty} = require('./has-own-property');


/**
 * @class
 */
function DataAttributeResolver() {

}

DataAttributeResolver.prototype.orderByNestedAttribute = function(attr) {
    var nestedAttribute = DataAttributeResolver.prototype.testNestedAttribute(attr);
    if (nestedAttribute) {
        var matches = /^(\w+)\((\w+)\/(\w+)\)$/i.exec(nestedAttribute.name);
        if (matches)   {
            return DataAttributeResolver.prototype.selectAggregatedAttribute.call(this, matches[1], matches[2] + '/' + matches[3]);
        }
        matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)$/i.exec(nestedAttribute.name);
        if (matches)   {
            return DataAttributeResolver.prototype.selectAggregatedAttribute.call(this, matches[1], matches[2] + '/' + matches[3] + '/' + matches[4]);
        }
    }
    return DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr);
};

DataAttributeResolver.prototype.selecteNestedAttribute = function(attr, alias) {
    var expr = DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr);
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
    if (DataAttributeResolver.prototype.testNestedAttribute(attribute)) {
        result = DataAttributeResolver.prototype.selecteNestedAttribute.call(self,attribute, alias);
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
            var expr1 = DataAttributeResolver.prototype.resolveJunctionAttributeJoin.call(self.model, attr);
            //select field
            select = expr1.$select;
            //get expand
            expr = expr1.$expand;
        }
        else {
            // create member expression
            var memberExpr = {
                name: attr
            };
            // and pass member expression
            expr = DataAttributeResolver.prototype.resolveNestedAttributeJoin.call(self.model, memberExpr);
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
                // and create query field expression
                select  = QueryField.select(member[1]).from(member[0]);
            }
        }
        if (expr) {
            if (_.isNil(self.query.$expand)) {
                self.query.$expand = expr;
            }
            else {
                arr = [];
                if (!_.isArray(self.query.$expand)) {
                    arr.push(self.query.$expand);
                    this.query.$expand = arr;
                }
                arr = [];
                if (_.isArray(expr))
                    arr.push.apply(arr, expr);
                else
                    arr.push(expr);
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
 * @returns {*} - An object that represents a query join expression
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
             * @type QueryExpression
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
                expr = DataAttributeResolver.prototype.resolveNestedAttributeJoin.call(parentModel, arrMember.slice(1).join('/'));
                return [].concat(res.$expand).concat(expr);
            }
            //--set active field
            return res.$expand;
        }
        else if (mapping.parentModel===self.name && mapping.associationType==='association') {
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
                expr = DataAttributeResolver.prototype.resolveNestedAttributeJoin.call(childModel, arrMember.slice(1).join('/'));
                // concat and return joins
                return [].concat(res.$expand).concat(expr);
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
            return res.$expand;
        }
        else {
            throw new Error(sprintf('The association type between %s and %s model is not supported for filtering, grouping or sorting data.', mapping.parentModel , mapping.childModel));
        }
    }
};

/**
 * @param {string} s
 * @returns {*}
 */
DataAttributeResolver.prototype.testAttribute = function(s) {
    if (typeof s !== 'string')
        return;
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
        return;
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
 * @returns {*}
 */
DataAttributeResolver.prototype.testNestedAttribute = function(s) {
    if (typeof s !== 'string')
        return;
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
        return { name: matches[1] + '(' + matches[2] + '/' + matches[3]  + ')', property:matches[4] };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b/c) as a
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + '/' + matches[3] + '/' + matches[4]  + ')', property:matches[5] };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b/c/d) as a
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\/(\w+)\)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + '/' + matches[3] + '/' + matches[4] + '/' + matches[5]  + ')', property:matches[6] };
    }
    /**
     * nested attribute with alias e.g. x/b as a
     * @ignore
     */
    matches = /^(\w+)\/(\w+)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '/' + matches[2], property:matches[3] };
    }
    /**
     * nested attribute with alias e.g. x/b/c as a
     * @ignore
     */
    matches = /^(\w+)\/(\w+)\/(\w+)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '/' + matches[2] + '/' + matches[3], property:matches[4] };
    }
    /**
     * nested attribute with alias e.g. x/b/c/d as a
     * @ignore
     */
    matches = /^(\w+)\/(\w+)\/(\w+)\/(\w+)\sas\s([\u0020-\u007F\u0080-\uFFFF]+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '/' + matches[2] + '/' + matches[3] + '/' + matches[4], property:matches[5] };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b)
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + '/' + matches[3]  + ')' };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b/c)
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '('  + matches[2] + '/' + matches[3] + '/' + matches[4]  + ')' };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b/c/d)
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\/(\w+)\)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '('  + matches[2] + '/' + matches[3] + '/' + matches[4] + matches[5]  + ')' };
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

};

/**
 * @param {string} attr
 * @returns {*}
 */
DataAttributeResolver.prototype.resolveJunctionAttributeJoin = function(attr) {
    var self = this, member = attr.split('/');
    //get the data association mapping
    var mapping = self.inferMapping(member[0]);
    //if mapping defines a junction between two models
    if (mapping && mapping.associationType === 'junction') {
        //get field
        var field = self.field(member[0]), entity, expr, q;
        //first approach (default association adapter)
        //the underlying model is the parent model e.g. Group > Group Members
        if (mapping.parentModel === self.name) {

            q =QueryUtils.query(self.viewAdapter).select(['*']);
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
                    $expand:[q.$expand],
                    $select:QueryField.select(mapping.associationValueField).from(field.name)
                }
            }

            //return the resolved attribute for futher processing e.g. members.id
            if (member[1] === mapping.childField) {
                return {
                    $expand:[q.$expand],
                    $select:QueryField.select(mapping.associationValueField).from(field.name)
                }
            }
            else {
                //get child model
                var childModel = self.context.model(mapping.childModel);
                if (_.isNil(childModel)) {
                    throw new DataError('EJUNC','The associated model cannot be found.');
                }
                //create new join
                var alias = field.name + '_' + childModel.name;
                entity = new QueryEntity(childModel.viewAdapter).as(alias);
                expr = QueryUtils.query().where(QueryField.select(mapping.associationValueField).from(field.name))
                    .equal(QueryField.select(mapping.childField).from(alias));
                //append join
                q.join(entity).with(expr);
                return {
                    $expand:q.$expand,
                    $select:QueryField.select(member[1]).from(alias)
                }
            }
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
                expr = QueryUtils.query().where(QueryField.select(mapping.associationObjectField).from(field.name))
                    .equal(QueryField.select(mapping.parentField).from(parentAlias));
                //append join
                q.join(entity).with(expr);
                return {
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

module.exports = {
    DataAttributeResolver
}
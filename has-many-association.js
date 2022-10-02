// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
/*eslint no-var: "off"*/
// noinspection ES6ConvertVarToLetConst

var {LangUtils} = require('@themost/common');
var _ = require('lodash');
var {QueryUtils} = require('@themost/query');
var types = require('./types');
var {DataQueryable} = require('./data-queryable');


/**
 * @class
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj - A DataObject instance that represents the parent data object
 * @param {string|*} association - A string that represents the name of the field which holds association mapping or the association mapping itself.
 * @property {DataObject} parent - Gets or sets the parent data object
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
function HasManyAssociation(obj, association)
{
    /**
     * @type {DataObject}
     * @private
     */
    var _parent = obj;
    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return _parent;
    }, set: function (value) {
        _parent = value;
    }, configurable: false, enumerable: false});
    var self = this;

    if (typeof association === 'string') {
        //infer mapping from field name
        //set relation mapping
        if (self.parent!=null) {
            var model = self.parent.getModel();
            if (model!=null)
                self.mapping = model.inferMapping(association);
        }
    }
    else if (typeof association === 'object' && association !=null) {
        //get the specified mapping
        if (association instanceof types.DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = _.assign(new types.DataAssociationMapping(), association);
    }

    var q = null;
    //override query property
    Object.defineProperty(this, 'query', {
        get:function() {
            //if query is already defined
            if (q!=null)
            //return this query
                return q;
            if (typeof self.mapping === 'undefined' || self.mapping==null)
                throw new Error('Data association mapping cannot be empty at this context.');
            //prepare query by selecting the foreign key of the related object
            q = QueryUtils.query(self.model.viewAdapter).where(self.mapping.childField).equal(self.parent[self.mapping.parentField]).prepare();
            return q;
        }, configurable:false, enumerable:false
    });

    var m = null;
    //override model property
    Object.defineProperty(this, 'model', {
        get:function() {
            //if query is already defined
            if (m!=null)
            //return this query
                return m;
            m = self.parent.context.model(self.mapping.childModel);
            return m;
        }, configurable:false, enumerable:false
    });
}
LangUtils.inherits(HasManyAssociation, DataQueryable);

module.exports = {
    HasManyAssociation
};


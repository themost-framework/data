// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const _ = require('lodash');
const {QueryUtils} = require('@themost/query');
const {DataAssociationMapping} = require('./types');
const {DataQueryable} = require('./data-queryable');

/**
 * @classdesc Represents a one-to-many association between two models.
 * @class
 * @augments DataQueryable
 * @property {DataObject} parent - Gets or sets the parent data object
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */

class HasManyAssociation extends DataQueryable {
    /**
     * 
     * @param {DataObject} obj - A DataObject instance that represents the parent data object
     * @param {string|*} association - A string that represents the name of the field which holds association mapping or the association mapping itself.
     */
    constructor(obj, association) {
        super();
        /**
         * @type {DataObject}
         * @private
         */
        let parent_ = obj;
        /**
         * Gets or sets the parent data object
         * @type DataObject
         */
        Object.defineProperty(this, 'parent', { get: function () {
            return parent_;
        }, set: function (value) {
            parent_ = value;
        }, configurable: false, enumerable: false});
        let self = this;

        if (typeof association === 'string') {
            //infer mapping from field name
            //set relation mapping
            if (self.parent!=null) {
                let model = self.parent.getModel();
                if (model!=null) {
                    self.mapping = model.inferMapping(association);
                }
            }
        } else if (typeof association === 'object' && association !=null) {
            //get the specified mapping
            if (association instanceof DataAssociationMapping) {
                self.mapping = association;
            } else {
                self.mapping = _.assign(new DataAssociationMapping(), association);
            }
        }

        let q = null;
        //override query property
        Object.defineProperty(this, 'query', {
            get:function() {
                //if query is already defined
                if (q!=null) {
                    return q;
                }
                if (typeof self.mapping === 'undefined' || self.mapping==null) {
                    throw new Error('Data association mapping cannot be empty at this context.');
                }
                //prepare query by selecting the foreign key of the related object
                q = QueryUtils.query(self.model.viewAdapter).where(self.mapping.childField).equal(self.parent[self.mapping.parentField]).prepare();
                return q;
            },
            configurable:true,
            enumerable:false
        });

        let m = null;
        //override model property
        Object.defineProperty(this, 'model', {
            get:function() {
                //if query is already defined
                if (m!=null) {
                    return m;
                }
                m = self.parent.context.model(self.mapping.childModel);
                return m;
            },
            configurable:true,
            enumerable:false
        });
    }
}


module.exports = {
    HasManyAssociation
};


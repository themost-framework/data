// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const _ = require('lodash');
const {QueryExpression, QueryField} = require('@themost/query');
const {DataAssociationMapping} = require('./types');
const {DataQueryable} = require('./data-queryable');
const {hasOwnProperty} = require('./has-own-property');
/**
 * @classdesc Represents a foreign key association between two models.
 * @class
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj - An instance of DataObject class that represents the parent data object
 * @param {string|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 * @property {DataObject} parent Gets or sets the parent data object
 */
class HasOneAssociation extends DataQueryable {
    constructor(obj, association) {
        super();
        /**
         * @type {DataObject}
         * @private
         */
        let parent = obj;
        /**
         * Gets or sets the parent data object
         * @type DataObject
         */
        Object.defineProperty(this, 'parent', {
            get: function () {
                return parent;
            }, set: function (value) {
                parent = value;
            }, configurable: false, enumerable: false
        });
        let self = this;
        /**
         * @type {DataAssociationMapping}
         */
        this.mapping = undefined;
        if (typeof association === 'string') {
            //infer mapping from field name
            //set relation mapping
            if (self.parent !== null) {
                let model = self.parent.getModel();
                if (model !== null) {
                    self.mapping = model.inferMapping(association);
                }
            }
        } else if (typeof association === 'object' && association !== null) {
            //get the specified mapping
            if (association instanceof DataAssociationMapping) {
                self.mapping = association;
            } else {
                self.mapping = _.assign(new DataAssociationMapping(), association);
            }
        }

        /**
         * @type QueryExpression
         */
        let _query;
        //override query property
        Object.defineProperty(this, 'query', {
            get: function () {
                //if query is already defined
                if (_query != null) {
                    return _query;
                }
                if (typeof self.mapping === 'undefined' || self.mapping === null) {
                    throw new Error('Data association mapping cannot be empty at this context.');
                }
                //get parent object
                let associatedValue = null;
                if (hasOwnProperty(self.parent, self.mapping.childField)) {
                    // get associated object
                    let associatedObject = self.parent[self.mapping.childField];
                    // if parent object has a property for mapping child field
                    if (associatedObject && hasOwnProperty(associatedObject, self.mapping.parentField)) {
                        // get associated value
                        associatedValue = associatedObject[self.mapping.parentField];
                    } else if (associatedObject != null) {
                        associatedValue = associatedObject;
                    }
                    // return query
                    _query = self.model.where(self.mapping.parentField).equal(associatedValue).prepare().query;
                    return _query;
                } else {
                    let childModel = self.parent.getModel();
                    let parentModel = self.model;
                    /**
                     * get empty query expression
                     * @type QueryExpression
                     */
                    _query = self.model.asQueryable().cache(false).select().query;
                    // get random alias
                    let alias = self.model.name + '0';
                    // get join left operand
                    let left = new QueryExpression().select(self.mapping.parentField).from(parentModel.viewAdapter).$select;
                    // get join right operand
                    let right = new QueryExpression().select(self.mapping.childField).from(alias).$select;
                    // create join
                    _query.join(childModel.viewAdapter, [], alias).with([left, right]);
                    // inject where
                    _query.injectWhere(new QueryExpression().where(new QueryField(self.model.primaryKey).from(alias)).equal(self.parent.getId()).$where);
                    // return query
                    return _query.prepare();
                }
            },
            configurable: true,
            enumerable: false
        });

        /**
         * @type DataModel
         */
        let _model;
        Object.defineProperty(this, 'model', {
            get: function () {
                if (_model) {
                    return _model;
                }
                if (self.parent && self.mapping) {
                    _model = this.parent.context.model(self.mapping.parentModel);
                    return _model;
                }
                return null;
            },
            configurable: true,
            enumerable: false
        });


    }
    getItems() {
        return Promise.reject(new Error('Unsupported method call:getItems()'));
    }
    getList() {
        return Promise.reject(new Error('Unsupported method call:getList()'));
    }
    getItem() {
        return super.getItem();
    }
    getAllItems() {
        return Promise.reject(new Error('Unsupported method call:getAllItems()'));
    }
}

module.exports = {HasOneAssociation};

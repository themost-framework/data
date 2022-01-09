// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const _ = require('lodash');
const {DataField} = require('./types');

/**
 * @property {string} title - Gets or sets the title of the current view
 * @property {string} name - Gets or sets the name of the current data view
 * @property {boolean} public - Gets or sets a boolean that indicates whether this data view is public or not.The default value is true.
 * @property {boolean} sealed - Gets or sets a boolean that indicates whether this data view is sealed or not. The default value is true.
 * @property {string|QueryExpression|*} filter - Gets or sets an open data formatted filter string or a query expression object associated with this view.
 * @property {string|*} order - Gets or sets an open data formatted order string or an order expression object associated with this view.
 * @property {string|*} group - Gets or sets an open data formatted group string or a group expression object associated with this view.
 * @property {Array} fields - Gets or sets the collection of data view's fields
 * @property {DataModel} model - Gets a DataModel instance that represents the parent model of the current view
 * @property {Array} attributes - A readonly collection of DataField instances
 * @param {DataModel} model - The parent model associated with this view
 */
class DataModelView {
    constructor(model) {

        this.public = true;
        this.sealed = true;
        this.fields = [];
        let _model = model;
        Object.defineProperty(this, 'model', {
            get: function () {
                return _model;
            }, configurable: false, enumerable: false
        });
        let self = this;
        Object.defineProperty(this, 'attributes', {
            get: function () {
                let attrs = [];
                self.fields.forEach(function (x) {
                    if (self.model) {
                        let field = _.assign(new DataField(), self.model.field(x.name));
                        if (field)
                            attrs.push(_.assign(field, x));

                        else
                            attrs.push(_.assign({}, x));
                    } else
                        //unbound view (?)
                        attrs.push(_.assign({}, x));

                });
                return attrs;
            }, configurable: false, enumerable: false
        });
    }
    /**
     * Casts an object or an array of objects based on view's field collection.
     * @param {Array|*} obj
     * @returns {Array|*}
     */
    cast(obj) {
        let self = this; let res;
        let localFields = this.fields.filter(function (y) {
            return !_.isNil(self.model.field(y.name));
        });
        if (_.isArray(obj)) {
            let arr = [];
            obj.forEach(function (x) {
                res = {};
                localFields.forEach(function (y) {
                    if (typeof x[y.name] !== 'undefined')
                        res[y.name] = x[y.name];
                });
                arr.push(res);
            });
            return arr;
        } else {
            res = {};
            localFields.forEach(function (y) {
                if (typeof obj[y.name] !== 'undefined')
                    res[y.name] = obj[y.name];
            });
            return res;
        }
    }
}

module.exports = {
    DataModelView
};
// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const { QueryField } = require('@themost/query');
const { DataAssociationMapping } = require('./types');
const { DataQueryable } = require('./data-queryable');
const { DataError } = require('@themost/common');
const { instanceOf } = require('./instance-of');
const { hasOwnProperty } = require('./has-own-property');
const parentProperty = Symbol('parent');
const mappingProperty = Symbol('mapping');

/**
 * @classdesc Represents a foreign key association
 */
class HasOneAssociation extends DataQueryable {
    constructor(object, association) {
        super();
        // set parent
        this.parent = object;
        // validate data association
        if (instanceOf(association, DataAssociationMapping) === false) {
            throw new Error('Expected a valid data association');
        }
        // set mapping
        this.mapping = association;
        if (this.parent == null) {
            throw new DataError('ERR_ASSOCIATION_PARENT', 'Data association parent object cannot be empty at this context.');
        }
        /**
         * @type {DataModel}
         */
        this.model = this.parent.context.model(this.mapping.parentModel);
        // set silent mode
        const silentMode = this.parent.getModel().isSilent();
        // set silent model
        this.model.silent(silentMode);

        let value;
        if (hasOwnProperty(this.parent, this.mapping.childField)) {
            // get foreign key
            value = this.parent[this.mapping.childField];
            // and prepare query
            // e.g. SELECT * FROM People WHERE id = @value
            this.where(this.mapping.parentField).equal(value).prepare();
        } else {
            let childModel = this.parent.getModel();
            let parentModel = this.model;
            // wildcard select e.g. SELECT [People].* FROM [People]
            this.select();
            // get random alias
            const alias = childModel.name + '0';
            // get join left operand e.g. [People].[id]
            let left = new QueryField(this.mapping.parentField).from(parentModel.viewAdapter);
            // get join right operand e.g. [Order0].[customer]
            let right = new QueryField(this.mapping.childField).from(alias);
            // create join 
            // e.g. INNER JOIN [Order] AS [Order0] ON [People].[id] = [Order0].[customer]
            this.query.join(childModel.viewAdapter, [], alias).with([left, right]);
            // prepare query e.g. WHERE [Order0].[id] = @id
            this.query.where(new QueryField(childModel.primaryKey).from(alias))
                .equal(this.parent.getId())
                .prepare();
        }
    }

    get mapping() {
        return this[mappingProperty];
    }

    set mapping(value) {
        this[mappingProperty] = value;
    }

    get parent() {
        return this[parentProperty];
    }

    set parent(value) {
        this[parentProperty] = value;
    }
    getItems() {
        throw new Error('Unsupported method call:getItems()');
    }
    getList() {
        throw new Error('Unsupported method call:getList()');
    }
    getAllItems() {
        throw new Error('Unsupported method call:getAllItems()');
    }
}

module.exports = {
    HasOneAssociation
}

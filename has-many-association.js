// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const {DataAssociationMapping} = require('./types');
const {DataQueryable} = require('./data-queryable');
const {DataError} = require('@themost/common');
const {instanceOf} = require('./instance-of');
const parentProperty = Symbol('parent');
const mappingProperty = Symbol('mapping');

/**
 * @classdesc Represents an one-to-many association between two models
 */
class HasManyAssociation extends DataQueryable {
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
        this.model = this.parent.context.model(this.mapping.childModel);
        // set silent mode
        const silentMode = this.parent.getModel().isSilent();
        // set silent model
        this.model.silent(silentMode);
        // set query
        const key = this.parent[this.mapping.parentField];
        // e.g. SELECT * FROM Orders WHERE customer = @key
        this.where(this.mapping.childField).equal(key).prepare();
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
}

module.exports = {
    HasManyAssociation
};


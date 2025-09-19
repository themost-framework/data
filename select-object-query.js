const {QueryExpression} = require('@themost/query');
const {hasOwnProperty} = require('./has-own-property');
const {isObjectDeep} = require('./is-object');

class SelectObjectQuery {
    constructor(model) {
        this.model = model;
    }

    /**
     * @param {*} source
     * @returns {import('@themost/query').QueryExpression}
     */
    select(source) {
        const self = this;
        const { viewAdapter: view } = self.model;
        const query = new QueryExpression().from(view);
        const mapped = self.map(source);
        const keys = Object.keys(mapped);
        // noinspection JSValidateTypes
        const select = keys.map(
            /**
             * @param {string} key
             * @returns {*}
             */
            function (key) {
                return {
                    [key]: {
                        $value: mapped[key]
                    }
                };
            });
        // select values
        query.select(select);
        // set query expression as fixed
        query.$fixed = true;
        return query;
    }

    /**
     * @param {*} source
     * @returns {*}
     */
    map(source) {
        const self = this;
        const keys = Object.keys(source);
        // noinspection JSValidateTypes
        return keys.map(function (key) {
            if (hasOwnProperty(source, key)) {
                return self.model.attributes.find(function (x) {
                    // try to find attribute by name or alias
                    return x.property === key || x.name === key;
                });
            }
        }).filter(function(attribute) {
            return attribute != null;
        }).filter(function(attribute) {
            return attribute.many !== true;
        }).filter(function(attribute) {
            const mapping = self.model.inferMapping(attribute.name);
            if (mapping == null) {
                return true;
            }
            return mapping.associationType === 'association' && mapping.childModel === self.model.name;
        }).reduce(
            /**
             * @param {*} prev
             * @param {import('./types').DataField} attribute
             * @returns {*}
             */
            function (prev, attribute) {
                const mapping = self.model.inferMapping(attribute.name);
                const name = attribute.property || attribute.name;
                // get property value
                const value = source[name];
                if (attribute.type === 'Json') {
                    Object.assign(prev, {
                        [name]: JSON.stringify(value)
                    });
                    return prev;
                }
                // if this property is a primitive typed property
                if (mapping == null) {
                    // assign property value
                    Object.assign(prev, {
                        [name]: value
                    });
                }
                // otherwise, if this property is an association
                if (isObjectDeep(value)) {
                    // assign associated key value (event.g. primary key value)
                    // ignore property if model doesn't have an association with it
                    if (mapping) {
                        Object.assign(prev, {
                            [name]: value[mapping.parentField]
                        });
                    }
                } else {
                    Object.assign(prev, {
                        [name]: value
                    });
                }
                return prev;
            }, {});
    }
}

module.exports = {
    SelectObjectQuery
};

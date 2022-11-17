const {Args, DataError} = require('@themost/common');
const {hasOwnProperty} = require('./has-own-property');
const {DataAttributeResolver} = require('./data-attribute-resolver');

class DataFieldQueryResolver {
    /**
     * @param {import("./data-model").DataModel} target
     */
    constructor(target) {
        this.target = target;
    }

    /**
     *
     * @param {string} value
     * @returns {string}
     */
    escapeName(value) {
        if (/^\$/.test(value)) {
            return value.replace(/(\$?(\w+)?)/g, '$2').replace(/\.(\w+)/g, '/$1')
        }
    }

    /**
     * @param {string} name
     * @returns {{$select?: import("@themost/query").QueryField, $expand?: import("@themost/query").QueryEntity[]}|null}
     */
    resolve(name) {
        const field = this.target.getAttribute(name);
        Args.check(field != null, new DataError('E_FIELD','The specified field cannot be found', null, this.target.name, name));
        if (field.query == null) {
            return null;
        }
        /**
         * @type {{$project: *, $lookup: *}}
         */
        var customQuery = field.query;
        // try to find $project[x.name] property e.g. { orderEmail: "$customer.email" }
        if (customQuery.$project && hasOwnProperty(customQuery.$project, field.name)) {
            // get expr
            const expr = Object.getOwnPropertyDescriptor(customQuery.$project, field.name).value;
            if (typeof expr === 'string') {
                // convert expression to an equivalent $select expression
                // e.g. $customer.email -> customer/email
                const selectAttribute = this.escapeName(expr);
                // resolve nested attribute ($select and $expand expressions)
                /**
                 * @type {DataQueryable}
                 */
                const q = this.target.asQueryable();
                const result = new DataAttributeResolver().resolveNestedAttribute.call(q, selectAttribute);
                return {
                    $select: result,
                    $expand: q.query.$expand ? [].concat(q.query.$expand) : []
                }
            } else {
                throw new Error('Resolving advanced expression is not yet implemented');
            }
        }
    }

}

module.exports = {
    DataFieldQueryResolver
}

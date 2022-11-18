const {Args, DataError} = require('@themost/common');
const {hasOwnProperty} = require('./has-own-property');
const {QueryEntity, QueryExpression, QueryField} = require('@themost/query');
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
    formatName(value) {
        if (/^\$/.test(value)) {
            return value.replace(/(\$?(\w+)?)/g, '$2').replace(/\.(\w+)/g, '.$1')
        }
        return value;
    }

    /**
     * @param {import("./types").DataField} field
     * @returns {{$select?: import("@themost/query").QueryField, $expand?: import("@themost/query").QueryEntity[]}|null}
     */
    resolve(field) {
        Args.check(field != null, new DataError('E_FIELD','Field may not be null', null, this.target.name));
        if (field.query == null) {
            return null;
        }
        let expand = [];
        let select = null;
        for (const stage of field.query) {
            if (stage.$lookup) {
                let localField = this.formatName(stage.$lookup.localField);
                if (/\./g.test(localField) === false) {
                    // get local field expression
                    let localFieldAttribute = this.target.getAttribute(localField);
                    if (localFieldAttribute && localFieldAttribute.model === this.target.name) {
                        localField = `${this.target.sourceAdapter}.${localField}`;
                    } else {
                        //get base
                        const baseModel = this.target.base();
                        if (baseModel) {
                            localFieldAttribute = baseModel.getAttribute(localField);
                            if (localFieldAttribute) {
                                localField = `${baseModel.viewAdapter}.${localField}`;
                            }
                        }
                    }
                }
                const foreignField = this.formatName(stage.$lookup.foreignField);
                const q = new QueryExpression().select('*').from(this.target.sourceAdapter);
                const joinCollection = new QueryEntity(stage.$lookup.from).as(stage.$lookup.as).left();
                q.join(joinCollection).with(
                    new QueryExpression().where(new QueryField(localField))
                        .equal(new QueryField(foreignField).from(stage.$lookup.as))
                );
                const appendExpand = [].concat(q.$expand);
                expand.push.apply(expand, appendExpand);
            }
            const name = field.property || field.name;
            if (stage.$project && hasOwnProperty(stage.$project, name)) {
                const expr = Object.getOwnPropertyDescriptor(stage.$project, name).value;
                if (typeof expr === 'string') {
                    select = new QueryField(this.formatName(expr)).as(name)
                } else {
                    throw new Error('Not yet implemented')
                }
            }
        }
        return {
            $select: select,
            $expand: expand
        }
    }

}

module.exports = {
    DataFieldQueryResolver
}

const {DataObjectState} = require('./types');
const {eachSeries} = require('async');
const {DataConfigurationStrategy} = require('./data-configuration');
const {DataError} = require('@themost/common');


function edmTypeToJsonType(edmType) {
    switch (edmType) {
        case 'Edm.String':
            return 'string';
        case 'Edm.Boolean':
            return 'boolean';
        case 'Edm.Byte':
        case 'Edm.SByte':
        case 'Edm.Int16':
        case 'Edm.Int32':
        case 'Edm.Int64':
            return 'integer';
        case 'Edm.Decimal':
        case 'Edm.Double':
            return 'number';
        case 'Edm.DateTime':
        case 'Edm.EdmDateTimeOffset':
        case 'Edm.Duration':
            return 'string';
        case 'Edm.Guid':
            return 'string';
        case 'Edm.Binary':
        case 'Edm.Stream':
            return 'string';
        default:
            return 'string';
    }
}

class OnJsonAttribute {

    /**
     * @param {import('./data-model').DataModel} model
     */
    static getJsonSchema(model) {
        const { context } = model;
        const {dataTypes} = context.getConfiguration().getStrategy(DataConfigurationStrategy);
        const additionalProperties = false;
        const properties = model.attributes.reduce((prev, attr) => {
            /**
             * @type {{edmtype: string,type:string}}
             */
            const dataType = dataTypes.find((t) => t.name === attr.type);
            let type = 'object';
            if (dataType != null) {
                type =  edmTypeToJsonType(dataType.edmtype);
            } else {
                // try to get related model
                const relatedModel = context.model(attr.type);
                // if related model exists
                if (relatedModel) {
                    // get json schema for related model
                    type = OnJsonAttribute.getJsonSchema(relatedModel);
                }
            }
            // set property
            Object.assign(prev, {
                [attr.name]: type
            });
            return prev;
        }, {});
        const required = model.attributes.filter((attr) => {
            return attr.nullable === false;
        }).map((attr) => attr.name);
        return {
            properties,
            required,
            additionalProperties
        }
    }

    /**
     * @param {import('./types').DataEventArgs} event
     * @param {function(err?:Error)} callback
     * @returns {Promise<void> | Promise<unknown>}
     */
    beforeSave(event, callback) {
        try {
            // get json attributes if any
            const attributes=  event.model.attributes.filter((attr) => {
                const editable = attr.editable !== false;
                const insertable = attr.insertable !== false;
                const include = event.state === DataObjectState.Insert ? insertable : editable;
                return include && attr.type === 'Json' && attr.additionalType != null && attr.model === event.model.name;
            }).filter((attr) => {
                return Object.prototype.hasOwnProperty.call(event.target, attr.name);
            });
            // exit if there are no json attributes
            if (attributes.length === 0) {
                return callback();
            }
            // iterate over json attributes
            void eachSeries(attributes, (attr, cb) => {
                // get attribute name
                const {name} = attr;
                const {[name]: value} = event.target;
                if (value == null) {
                    return cb();
                }
                try {
                    const targetModel = event.model.context.model(attr.additionalType);
                    if (targetModel == null) {
                        return cb(new DataError('ERR_INVALID_MODEL', 'Property additional type cannot be determined.', 'The target model cannot be found.', event.model.name, attr.name));
                    }
                    // execute beforeSave event
                    // this operation will add calculated values and validate the object against the current state of the model
                    void targetModel.emit('before.save', {
                        target: value,
                        state: event.state,
                        model: targetModel
                    }, (err) => {
                        if (err) {
                            return cb(err);
                        }
                        // get object properties
                        const properties = Object.getOwnPropertyNames(value);
                        // get target model attributes
                        const attributes = targetModel.attributeNames;
                        // check if all properties are defined in the target model
                        const additionalProperty = properties.find((prop) => attributes.indexOf(prop) < 0);
                        if (additionalProperty != null) {
                            return cb(new DataError('ERR_INVALID_PROPERTY', `The given structured value seems to be invalid. The property '${additionalProperty}' is not defined in the target model.`, null, event.model.name, attr.name));
                        }
                        return cb();
                    });

                } catch(err) {
                    return cb(err);
                }
            }, (err) => {
                if (err) {
                    return callback(err);
                }
                return callback();
            });
        } catch (err) {
            return callback(err);
        }
    }

    /**
     * @protected
     * @param {{model: DataModel, result: any}} event
     * @param {function(err?:Error): void} callback
     * @returns void
     */
    static afterAny(event, callback) {
        const attributes = event.model.attributes.filter((attr) => {
            return attr.type === 'Json' && attr.additionalType != null && attr.model === event.model.name;
        });
        if (attributes.length === 0) {
            return callback();
        }
        // define json converter
        const parseJson = (item) => {
            attributes.forEach((attr) => {
                const {name} = attr;
                if (Object.prototype.hasOwnProperty.call(item, name)) {
                    const value = item[name];
                    if (typeof  value === 'string') {
                        item[name] = JSON.parse(value);
                    }
                }
            });
        };
        // iterate over result
        const {result} = event;
        if (Array.isArray(result)) {
            result.forEach((item) => parseJson(item));
        } else {
            // or parse json for single item
            parseJson(result)
        }
        return callback();
    }

    /**
     * @param {import('./types').DataEventArgs} event
     * @param {function(err?:Error): void} callback
     * @returns void
     */
    afterSave(event, callback) {
        return OnJsonAttribute.afterAny({
            model: event.model,
            result: event.target
        }, callback);
    }

    /**
     * @param {import('./types').DataEventArgs} event
     * @param {function(err?:Error): void} callback
     * @returns void
     */
    afterExecute(event, callback) {
        try {
            if (event.emitter && event.emitter.query && event.emitter.query.$select && event.result) {
                return OnJsonAttribute.afterAny(event, callback);
            }
            return callback();
        } catch (err) {
            return callback(err);
        }
    }

}

module.exports = {
    OnJsonAttribute
}
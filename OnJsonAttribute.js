const {DataObjectState} = require('./types');
const {eachSeries} = require('async');
const {DataConfigurationStrategy} = require('./data-configuration');
const {DataError} = require('@themost/common');

function isJSON(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

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
            const dataType = attr.type !== 'Json' ? dataTypes[attr.type] : null;
            let type = 'object';
            let assign = {};
            if (dataType != null) {
                type =  edmTypeToJsonType(dataType.edmtype);
                assign = {
                    [attr.name]: {
                        type
                    }
                }
            } else {
                // try to get related model
                let relatedModel = attr.additionalType != null ? context.model(attr.additionalType) : context.model(attr.type);
                // if related model exists
                if (relatedModel) {
                    // get json schema for related model
                    assign = {
                        [attr.name]: Object.assign(OnJsonAttribute.getJsonSchema(relatedModel), {
                            type
                        })
                    }
                } else {
                    // if related model does not exist
                    assign = {
                        [attr.name]: {
                            type
                        }
                    };
                }
            }
            // set property
            Object.assign(prev, assign);
            return prev;
        }, {});
        const required = model.attributes.filter((attr) => {
            const primary = attr.primary === true;
            const many = attr.many === true;
            return attr.nullable === false && many === false && primary === false;
        }).map((attr) => attr.name);
        return {
            properties,
            required,
            additionalProperties
        }
    }

    /**
     * @param {import('./data-model').DataModel} model 
     * @returns {Array<import('./types').DataField>}
     */
    static getJsonAttributes(model) {
        return model.attributes.filter((attr) => {
            return attr.type === 'Json' && attr.additionalType != null;
        });
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
     * @param {import('./data-queryable').DataQueryable} queryable
     * @param {string} expr
     */
    static tryGetJsonAttributeFromString(queryable , expr) {
        if (queryable == null) {
            return;
        }
        const model = queryable.model;
        const matches = expr.split('.');
        const {context} = model;
        if (matches && matches.length > 1) {
            let index = 1;
            let nextModel = model;
            //  get view source
            const { viewAdapter: viewEntity } = model;
            const fromEntity = matches[0].replace(/^\$/, '')
            if (fromEntity !== viewEntity) {
                if (Array.isArray(queryable.query.$expand) === false) {
                    return;
                }
                // find join entity with the same name
                const join = queryable.query.$expand.find((join) => {
                    return join.$entity.$as === fromEntity;
                });
                const fromModel = join && join.$entity && join.$entity.model;
                if (typeof fromModel !== 'string') {
                    return;
                }
                // change next model to join model
                nextModel = context.model(fromModel);
            }

            // iterate over matches
            while(index < matches.length) {
                let attribute = nextModel.getAttribute(matches[index]);
                if (attribute && attribute.type === 'Json') {
                    if (index + 1 === matches.length) {
                        return attribute;
                    }
                    if (attribute.additionalType) {
                        // get next model
                        nextModel = context.model(attribute.additionalType)
                    } else {
                        return attribute;
                    }
                } else {
                    break;
                }
                index++;
            }
        }
    }

    /**
     * @protected
     * @param {{model: DataModel, result: any, emitter?: import('./data-queryable').DataQueryable}} event
     * @param {function(err?:Error): void} callback
     * @returns void
     */
    static afterSelect(event, callback) {
        try {
            const jsonAttributes = event.model.attributes.filter((attr) => {
                return attr.type === 'Json' && attr.model === event.model.name;
            }).map((attr) => attr.name);
            // try to find json attributes that are included in join expressions
            const joins = event.emitter && event.emitter.query && event.emitter.query.$expand;
            if (joins && joins.length > 0) {
                joins.forEach((join) => {
                    /**
                     * @type {{ $as: string=, model: string= }}
                     */
                    const entity = join.$entity;
                    if (entity && typeof entity.model === 'string') {
                        const joinModel = event.model.context.model(entity.model);
                        if (joinModel) {
                            const attributes = joinModel.attributes.filter((attr) => {
                                return attr.type === 'Json' && attr.model === joinModel.name;
                            }).map((attr) => attr.name);
                            jsonAttributes.push(...attributes);
                        }
                    }
                })
            }
            if (jsonAttributes.length === 0) {
                return callback();
            }
            let select = [];
            const {viewAdapter: entity} = event.model;
            if (event.emitter && event.emitter.query && event.emitter.query.$select) {
                const querySelect = event.emitter.query.$select[entity] || [];
                select.push(...querySelect);
            }
            let attributes = select.reduce((prev, element) => {
                // if select element is a typical query field with $name property
                if (element && typeof element.$name === 'string') {
                    // split $name property by dot
                    const matches = element.$name.split('.');
                    // if there are more than one parts
                    if (matches && matches.length > 1) {
                        // get last part
                        if (jsonAttributes.indexOf(matches[1]) >= 0) {
                            prev.push(matches.pop());
                        }
                    }
                } else {
                    // try to get first property which should be attribute alias
                    const [key] = Object.keys(element);
                    if (Object.hasOwnProperty.call(element, key)) {
                        /**
                         * @type {{$jsonGet?: any[]}|string}
                         */
                        const selectField = element[key];
                        // if select field has $jsonGet property
                        if (selectField.$jsonGet) {
                            const [jsonGet] = selectField.$jsonGet;
                            // if jsonGet has $name property
                            if (jsonGet && typeof jsonGet.$name === 'string') {
                                const attribute = OnJsonAttribute.tryGetJsonAttributeFromString(event.emitter, jsonGet.$name);
                                if (attribute) {
                                    prev.push(key);
                                }
                            }
                        }

                        // try to validate query expressions where the query field has an alias
                        // e.g. { 'orderTags': { $name: 'OrderData.tags' } }
                        // or // { 'orderTags': 'OrderData.tags' }
                        // the tags attribute is a Json attribute and should be converted to object
                        if (!key.startsWith('$')) {
                            if (typeof selectField === 'string') {
                                const attribute = OnJsonAttribute.tryGetJsonAttributeFromString(event.emitter, selectField);
                                if (attribute) {
                                    prev.push(key);
                                }
                            }
                        }


                    }
                }
                return prev
            }, []);
            if (select.length === 0) {
                attributes = jsonAttributes;
            }
            if (attributes.length === 0) {
                return callback();
            }
            // define json converter
            const parseJson = (item) => {
                attributes.forEach((name) => {
                    if (Object.prototype.hasOwnProperty.call(item, name)) {
                        const value = item[name];
                        if (typeof value === 'string') {
                            item[name] = isJSON(value) ? JSON.parse(value) : value;
                        }
                    }
                });
            };
            // iterate over result
            const {result} = event;
            if (result == null) {
                return callback();
            }
            if (Array.isArray(result)) {
                result.forEach((item) => parseJson(item));
            } else {
                // or parse json for single item
                parseJson(result)
            }
            return callback();
        } catch (err) {
            return callback(err);
        }
    }

    /**
     * @param {import('./types').DataEventArgs} event
     * @param {function(err?:Error): void} callback
     * @returns void
     */
    afterSave(event, callback) {
        return OnJsonAttribute.afterSelect({
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
                return OnJsonAttribute.afterSelect(event, callback);
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
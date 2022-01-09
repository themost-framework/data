// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const {DataError} = require('@themost/common');
const {DataObjectJunction} = require('./data-object-junction');
class ZeroOrOneMultiplicityListener {
    constructor() {
        //
    }
    /**
     * @param {DataEventArgs} event
     * @param {Function(Error=)} callback
     */
    afterSave(event, callback) {
        let afterSaveAsync = ZeroOrOneMultiplicityListener.prototype.afterSaveAsync.bind(this);
        return afterSaveAsync(event).then(function () {
            return callback();
        }).catch(function (err) {
            return callback(err);
        });
    }
    /**
     * @param {DataEventArgs} event
     * @return {Promise<void>}
     */
    afterSaveAsync(event) {
        return new Promise(function (resolve, reject) {
            // get attributes that defines an zero or one multiplicity association
            // with this context model
            let attributes = event.model.attributes.filter(function (attribute) {
                if (Object.prototype.hasOwnProperty.call(event.target, attribute.name) === false) {
                    return false;
                }
                if (attribute.mapping == null) {
                    return false;
                }
                // get mapping 
                let mapping = event.model.inferMapping(attribute.name);
                return !attribute.nested && //exclude nested attributes
                    attribute.multiplicity === 'ZeroOrOne' && // validate multiplicity
                    mapping.associationType === 'junction' && // and association type
                    mapping.parentModel === event.model.name;
            });
            if (attributes.length === 0) {
                // do nothing
                return resolve();
            }
            let sources = attributes.map(function (attribute) {
                return new Promise(function (_resolve, _reject) {
                    // exclude readonly attributes
                    if (Object.prototype.hasOwnProperty.call(attribute, 'readonly')) {
                        if (attribute.readonly) {
                            return _resolve();
                        }
                    }
                    // exclude non-editable attributes while updating object
                    if (Object.prototype.hasOwnProperty.call(attribute, 'editable') && event.state === 2) {
                        if (!attribute.editable) {
                            return _resolve();
                        }
                    }
                    const child = event.target[attribute.name];
                    let context = event.model.context;
                    // get target
                    let target = event.model.convert(event.target);
                    // get attribute mapping
                    let mapping = event.model.inferMapping(attribute.name);
                    // get association def
                    let association = new DataObjectJunction(target, mapping);
                    // get silent model of parent model
                    const silent = event.model.isSilent();
                    if (child != null) {
                        // find child
                        let childModel = context.model(mapping.childModel);
                        return childModel.silent(silent).find(child).getItem().then(function (item) {
                            if (item == null) {
                                return _reject(new DataError('EDATA', 'An associated object cannot be found.', null, event.model.name, attribute.name));
                            }
                            // try to create association between parent and child
                            return association.silent(silent).insert(item).then(function () {
                                return _resolve();
                            });
                        }).catch(function (err) {
                            return _reject(err);
                        });
                    } else {
                        // remove zero or one association
                        // get item
                        return association.silent(silent).getItem().then(function (item) {
                            // if child already exists remove association
                            if (item) {
                                return association.silent(silent).remove(item).then(function () {
                                    return _resolve();
                                });
                            }
                            // otherwise do nothing
                            return _resolve();
                        }).catch(function (err) {
                            return _reject(err);
                        });
                    }
                });
            });
            // execute all promises
            Promise.all(sources).then(function () {
                return resolve();
            }).catch(function (err) {
                return reject(err);
            });
        });
    }
}

module.exports = {
    ZeroOrOneMultiplicityListener
};
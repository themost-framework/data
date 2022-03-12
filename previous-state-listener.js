// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
function previousStateListener(event, callback) {
    var _ = require('lodash');
    if (event.state===1) { return callback(); }
    var key = event.model.primaryKey;
    if (_.isNil(event.target[key])) {
        return callback();
    }
    event.model.where(key).equal(event.target[key]).silent().first(function(err,result) {
        if (err) {
            return callback(err);
        }
        else {
            event.previous = result;
            return callback();
        }
    });
}
/**
 * Occurs before creating or updating a data object.
 * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
 */
function beforeSave(event, callback) {
    return previousStateListener(event, callback);
}

/**
 * Occurs before removing a data objects.
 * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
 */
function beforeRemove(event, callback) {
    return previousStateListener(event, callback);
}

module.exports = {
    beforeSave,
    beforeRemove
}
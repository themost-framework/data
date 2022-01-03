// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
function previousStateListener(event, callback) {
    if (event.state===1) { return callback(); }
    const key = event.model.primaryKey;
    if (event.target[key] == null) {
        return callback();
    }
    event.model.where(key).equal(event.target[key]).silent().first(function(err, result) {
        if (err) {
            return callback(err);
        }
        else {
            event.previous = result;
            return callback();
        }
    });
}

module.exports = {
    /**
     * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    beforeSave: function(event, callback) {
        return previousStateListener(event, callback);
    },
    /**
     * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    beforeRemove: function(event, callback) {
        return previousStateListener(event, callback);
    }
}
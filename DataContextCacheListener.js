/**
 * @param {import('./types').DataEventArgs} event
 * @param {function(err:Error=):void} callback
 * @returns {void}
 */
function beforeExecute(event, callback) {
    try {
        if (event.query && event.query.$select) {
            if (event.emitter) {
                Object.defineProperty(event.emitter, 'hashCode', {
                    enumerable: false,
                    value: event.emitter.toMD5()
                });
                // noinspection JSUnresolvedReference
                const item = event.model.context.cache.get(`/${event.model.name}/?$query=${event.emitter.hashCode}`);
                if (typeof item !== 'undefined') {
                    event.result = item;
                }
            }
        }
        return callback();
    } catch (err) {
        return callback(err);
    }
}

/**
 * @param {import('./types').DataEventArgs} event
 * @param {function(err:Error=):void} callback
 * @returns {void}
 */
function afterExecute(event, callback) {
    try {
        if (typeof event.result === 'undefined') {
            return callback();
        }
        if (event.emitter && event.emitter.hashCode) {
            event.model.context.cache.set(`/${event.model.name}/?$query=${event.emitter.hashCode}`, event.result);
        }
        return callback();
    } catch (err) {
        return callback(err);
    }
}

module.exports = {
    beforeExecute,
    afterExecute
}
/**
 * @param {import('./types').DataEventArgs} event
 * @param {function(err:Error=):void} callback
 * @returns {void}
 */
function beforeExecute(event, callback) {
    try {
        const caching = event.model.caching === 'none' && typeof event.emitter.data === 'function' && event.emitter.data('cache') === true;
        if (!caching) {
            return callback();
        }
        if (event.query && event.query.$select) {
            if (event.emitter) {
                // check if caching is disabled but emitter sets cache flag to true
                if (typeof event.emitter.hashCode === 'undefined') {
                    Object.defineProperty(event.emitter, 'hashCode', {
                        enumerable: false,
                        configurable: true,
                        writable: true,
                        value: event.emitter.toMD5()
                    });
                }
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
        // check if caching is disabled but emitter sets cache flag to true
        const caching = event.model.caching === 'none' && typeof event.emitter.data === 'function' && event.emitter.data('cache') === true;
        if (!caching) {
            return callback();
        }
        if (event.emitter && event.emitter.hashCode) {
            if (Object.hasOwnProperty.call(event.model.context, 'cache') === false) {
                Object.defineProperty(event.model.context, 'cache', {
                    enumerable: false,
                    configurable: true,
                    writable: true,
                    value: new Map()
                });
            }
            // noinspection JSUnresolvedReference
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
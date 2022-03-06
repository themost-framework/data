// eslint-disable-next-line no-unused-vars
const { SequentialEventEmitter, AbstractClassError, AbstractMethodError, ConfigurationBase } = require('@themost/common');

class DataContext extends SequentialEventEmitter {

    constructor() {
        super();
        if (this.constructor === DataContext.prototype.constructor) {
            throw new AbstractClassError();
        }
        Object.defineProperty(this, 'db', {
            configurable : true,
            enumerable: false,
            writable: true,
            value: null
        });
        Object.defineProperty(this, 'application', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: null
        });
    }

    /**
     * Gets application configuration
     * @returns {ConfigurationBase}
     */
    getConfiguration() {
        if (this.application) {
            return this.application.getConfiguration();
        }
        return null;
    }

    /**
     * 
     * @param {*} name
     * @return {DataModel}
     */
    // eslint-disable-next-line no-unused-vars
    model(name) {
        throw new AbstractMethodError();
    }

    /**
     * Finalizes data context
     * @param {function} callback 
     * @returns {void}
     */
    // eslint-disable-next-line no-unused-vars
    finalize(callback) {
        throw new AbstractMethodError();
    }
    /**
     * Finalizes data context
     * @returns {Promise<void>}
     */
    finalizeAsync() {
        const self = this;
        return new Promise(function(resolve, reject) {
            return self.finalize(function(err) {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    /**
     * Executes the given closure in transaction
     * @param {function():Promise<void>} func
     * @returns {Promise<void>}
     */
    executeInTransactionAsync(func) {
        const self = this;
        return new Promise((resolve, reject) => {
            // start transaction
            return self.db.executeInTransaction(function(cb) {
                try {
                    func().then(function() {
                        // commit
                        return cb();
                    }).catch( function(err) {
                        // rollback
                        return cb(err);
                    });
                }
                catch (err) {
                    return cb(err);
                }
            }, function(err) {
                if (err) {
                    return reject(err);
                }
                // end transaction
                return resolve();
            });
        });
    }
}

module.exports = {
    DataContext
}
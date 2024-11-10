var unattendedMode = Symbol('unattendedMode');
var { RandomUtils } = require('@themost/common');
/**
 * Execute a callable function with eleveted privileges in unattended mode.
 * @param {import('./types').DataContext} context
 * @param {function(function(Error?): void)} callable 
 * @param {function(Error?): void} callback 
 * @returns {void}
 */
function executeInUnattendedMode(context, callable, callback) {
    if (typeof callable !== 'function') {
        return callback(new Error('Unattended mode requires a callable function'));
    }
    // if the context is in unattended mode
    if (context[unattendedMode]) {
        // execute callable function
        return callable(function(err) {
            return callback(err);
        });
    }
    // enter unattended mode
    context[unattendedMode] = true;
    // execute callable function
    var interactiveUser;
    try {
        const account = context.getConfiguration().getSourceAt('settings/auth/unattendedExecutionAccount');
        if (account == null) {
            return callback(new Error('The unattended execution account is not defined. The operation cannot be completed.'));
        }
        // get interactive user
        if (context.user) {
            interactiveUser = Object.assign({}, context.user);
            // set interactive user
            context.interactiveUser = interactiveUser;
        }
        if (account) {
            context.user = { name:account, authenticationType:'Basic' };
        }
        return callable(function(err) {
            // restore user
            if (interactiveUser) {
                context.user = Object.assign({}, interactiveUser);
            }
            delete context.interactiveUser;
            // exit unattended mode
            delete context[unattendedProperty];
            return callback(err);
        });
    } catch (err) {
        // restore user
        if (interactiveUser) {
            context.user = Object.assign({}, interactiveUser);
        }
        delete context.interactiveUser;
        // exit unattended mode
        delete context[unattendedProperty];
        return callback(err);
    }
}

/**
 * Execute a callable function with eleveted privileges in unattended mode.
 * @param {import('./types').DataContext} context
 * @param {function(): Promise<void>} callable 
 * @returns {Promise<void>}
 */
function executeInUnattendedModeAsync(context, callable) {
    return new Promise((resolve, reject) => {
        return executeInUnattendedMode(function(cb) {
            return callable().then(function() {
                return cb();
            }).catch(function(err) {
                return cb(err);
            });
        }, function(err) {
            if (err) {
                return reject(err);
            }
            return resolve();
        });
    });
}
/**
 * Enables unattended mode
 * @param {{getConfiguration(): import('@themost/common').ConfigurationBase}} app 
 * @param {string=} executionAccount
 */
function enableUnattendedExecution(app, executionAccount) {
    app.getConfiguration().setSourceAt('settings/auth/unattendedExecutionAccount', executionAccount || RandomUtils.randomChars(14));
}

function disableUnattendedExecution(app) {
    app.getConfiguration().setSourceAt('settings/auth/unattendedExecutionAccount', null);
}

module.exports = {
    executeInUnattendedMode,
    executeInUnattendedModeAsync,
    enableUnattendedExecution,
    disableUnattendedExecution
}
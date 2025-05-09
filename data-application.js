// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
var {Args, PathUtils, SequentialEventEmitter} = require('@themost/common');
var {DataConfiguration} = require('./data-configuration');
var {DefaultDataContext} = require('./data-context');
const { UserService } = require('./UserService');
/**
 * @class
 * @param {string} cwd - A string which defines application root directory
 */
class DataApplication extends SequentialEventEmitter {
    constructor(cwd) {
        super();
        Object.defineProperty(this, '_services', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: {}
        });
        Object.defineProperty(this, 'configuration', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: new DataConfiguration(PathUtils.join(cwd, 'config'))
        });
        this.useService(UserService);
    }
    hasService(serviceCtor) {
        if (serviceCtor == null) {
            return false;
        }
        Args.check(typeof serviceCtor === 'function', new Error('Strategy constructor is invalid.'));
        return Object.prototype.hasOwnProperty.call(this._services, serviceCtor.name);
    }
    getService(serviceCtor) {
        if (serviceCtor == null) {
            return false;
        }
        Args.check(typeof serviceCtor === 'function', new Error('Strategy constructor is invalid.'));
        if (Object.prototype.hasOwnProperty.call(this._services, serviceCtor.name) === false) {
            return;
        }
        return this._services[serviceCtor.name];
    }
    useStrategy(serviceCtor, strategyCtor) {
        if (strategyCtor == null) {
            return false;
        }
        Args.check(typeof serviceCtor === 'function', new Error('Service constructor is invalid.'));
        Args.check(typeof strategyCtor === 'function', new Error('Strategy constructor is invalid.'));
        Object.defineProperty(this._services, serviceCtor.name, {
            configurable: true,
            enumerable: true,
            writable: true,
            value: new strategyCtor(this)
        });
        return this;
    }
    useService(serviceCtor) {
        return this.useStrategy(serviceCtor, serviceCtor);
    }
    getConfiguration() {
        return this.configuration;
    }
    createContext() {
        const context = new DefaultDataContext();
        // override configuration
        context.getConfiguration = () => {
            return this.configuration;
        };
        return context;
    }
}

module.exports = {
    DataApplication
};


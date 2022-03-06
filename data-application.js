// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
var Args = require('@themost/common').Args;
var DataConfiguration = require('./data-configuration').DataConfiguration;
var DefaultDataContext = require('./data-context').DefaultDataContext;
var PathUtils = require('@themost/common').PathUtils;
/**
 * @class
 * @param {string} cwd - A string which defines application root directory
 */
function DataApplication(cwd) {
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
}

DataApplication.prototype.hasService = function(serviceCtor) {
    if (serviceCtor == null) {
        return false;
    }
    Args.check(typeof serviceCtor === 'function', new Error('Strategy constructor is invalid.'));
    return Object.prototype.hasOwnProperty.call(this._services, serviceCtor.name);
};

DataApplication.prototype.getService = function(serviceCtor) {
    if (serviceCtor == null) {
        return false;
    }
    Args.check(typeof serviceCtor === 'function', new Error('Strategy constructor is invalid.'));
    if (Object.prototype.hasOwnProperty.call(this._services, serviceCtor.name) === false) {
        return;
    }
    return this._services[serviceCtor.name];
};

DataApplication.prototype.useStrategy = function(serviceCtor, strategyCtor) {
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
};

DataApplication.prototype.useService = function(serviceCtor) {
    return this.useStrategy(serviceCtor, serviceCtor);
};

DataApplication.prototype.getConfiguration = function() {
    return this.configuration;
};

DataApplication.prototype.createContext = function() {
    const context = new DefaultDataContext();
    // override configuration
    context.getConfiguration = () => {
        return this.configuration;
    };
    context.application = this;
    return context;
};

module.exports = {
    DataApplication: DataApplication
};


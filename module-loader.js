// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
var {LangUtils} = require('@themost/common');
var Symbol = require('symbol');
var path = require('path');
var executionPathProperty = Symbol('executionPath');

/**
 * @class
 * @constructor
 * @abstract
 */
function ModuleLoader() {
    if (this.constructor.name === 'ModuleLoader') {
        throw new Error('An abstract class cannot be instantiated.');
    }
}

/**
 * @param {string} modulePath
 * @returns {*}
 * @abstract
 */
// eslint-disable-next-line no-unused-vars
ModuleLoader.prototype.require = function(modulePath) {
    throw new Error('Class does not implement inherited abstract method.');
};
/**
 * @param {string} anyPath
 * @returns { {path: string, member: string} }
 */
ModuleLoader.parseRequire = function(anyPath) {
    if (anyPath == null) {
        throw new Error('Module path must be a string');
    }
    var hashIndex = anyPath.indexOf('#');
    // if path does not contain hash
    if (hashIndex < 0) {
        // return only path
        return {
            path: anyPath
        };
    }
    // otherwise, split the given path and return path and member
    // e.g. { path: './my-module', member: 'MyClass' }
    return {
        path: anyPath.substr(0, hashIndex),
        member: anyPath.substr(hashIndex + 1)
    }
};

/**
 * @class
 * @param {string} executionPath
 * @constructor
 * @augments ModuleLoader
 * @extends ModuleLoader
 */
function DefaultModuleLoader(executionPath) {
    DefaultModuleLoader.super_.bind(this)();
    this[executionPathProperty] = path.resolve(executionPath) || process.cwd();
}
LangUtils.inherits(DefaultModuleLoader, ModuleLoader);

DefaultModuleLoader.prototype.getExecutionPath = function() {
    return this[executionPathProperty];
};
/**
 * @param {string} modulePath
 * @returns {*}
 */
DefaultModuleLoader.prototype.require = function(modulePath) {
    if (!/^.\//i.test(modulePath)) {
        //load module which is not starting with ./
        if (require.main && typeof require.main.require === 'function') {
            return require.main.require(modulePath)
        }
        return require(modulePath);
    }
    return require(path.join(this.getExecutionPath(),modulePath));
};
module.exports = {
    ModuleLoader,
    DefaultModuleLoader
}


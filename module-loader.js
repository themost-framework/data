// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const Symbol = require('symbol');
const path = require('path');
const executionPathProperty = Symbol('executionPath');

/**
 * @abstract
 */
class ModuleLoader {
    constructor() {
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
    require(modulePath) {
        throw new Error('Class does not implement inherited abstract method.');
    }
    /**
     * @param {string} anyPath
     * @returns { {path: string, member: string} }
     */
    static parseRequire(anyPath) {
        if (anyPath == null) {
            throw new Error('Module path must be a string');
        }
        let hashIndex = anyPath.indexOf('#');
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
        };
    }
}


/**
 * @class
 * @param {string} executionPath
 * @constructor
 * @augments ModuleLoader
 * @extends ModuleLoader
 */
class DefaultModuleLoader extends ModuleLoader {
    constructor(executionPath) {
        super();
        this[executionPathProperty] = path.resolve(executionPath) || process.cwd();
    }
    getExecutionPath() {
        return this[executionPathProperty];
    }
    /**
     * @param {string} modulePath
     * @returns {*}
     */
    require(modulePath) {
        if (!/^.\//i.test(modulePath)) {
            return require(modulePath);
        }
        return require(path.join(this.getExecutionPath(), modulePath));
    }
}

module.exports = {
    ModuleLoader,
    DefaultModuleLoader
}
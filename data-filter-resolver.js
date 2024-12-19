// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
var {FunctionContext} = require('./functions');
var { UnknownAttributeError } = require('./data-errors');

/**
 * @ignore
 * @class
 * @abstract
 * @constructor
 * @augments DataModel
 */
function DataFilterResolver() {
    //
}

DataFilterResolver.prototype.resolveMember = function(member, callback) {
    if (typeof member !== 'string') {
        return callback(null, member);
    }
    if (/\//.test(member)) {
        var arr = member.split('/');
        return callback(null, arr.slice(arr.length-2).join('.'));
    }
    var attribute = this.getAttribute(member);
    if (attribute == null) {
        return callback(new UnknownAttributeError(this.name, member));
    }
    return callback(null, this.viewAdapter.concat('.', member))
};

DataFilterResolver.prototype.resolveMethod = function(name, args, callback) {
    callback = callback || function() { };
    if (typeof DataFilterResolver.prototype[name] === 'function') {
        var a = args || [];
        a.push(callback);
        try {
            return DataFilterResolver.prototype[name].apply(this, a);
        }
        catch(e) {
            return callback(e);
        }

    }
    callback();
};
/**
 * @param {Function} callback
 */
DataFilterResolver.prototype.me = function(callback) {
    var fx = new FunctionContext(this.context, this);
    fx.user().then(function(value) {
        callback(null, value)
    }).catch(function(err) {
        callback(err);
    });
};
/**
 * @param {Function} callback
 */
DataFilterResolver.prototype.now = function(callback) {
    callback(null, new Date());
};
/**
 * @param {Function} callback
 */
DataFilterResolver.prototype.today = function(callback) {
    var res = new Date();
    res.setHours(0,0,0,0);
    callback(null, res);
};
/**
 * @param {Function} callback
 */
DataFilterResolver.prototype.lang = function(callback) {
    let culture = this.context.culture();
    if (culture) {
        return callback(null, culture.substr(0,2));
    }
    else {
        return callback(null, 'en');
    }

};
/**
 * @param {Function} callback
 */
DataFilterResolver.prototype.user = function(callback) {
    return this.me(callback);
};

module.exports = {
    DataFilterResolver
};

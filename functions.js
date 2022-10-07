// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
/*eslint no-var: "off"*/
// noinspection ES6ConvertVarToLetConst

var {TypeParser} = require('./types');
var {TraceUtils} = require('@themost/common');
// eslint-disable-next-line no-unused-vars
var moment = require('moment');
var _ = require('lodash');

/**
 * @class
 * @classdesc A utility class which offers a set of methods for calculating the default values of a data model
 * @param {DataContext=} context
 * @param {DataModel=} model
 * @param {*=} target
 * @constructor
*/
function FunctionContext(context, model, target) {
    /**
     * @type {DataContext}
    */
    this.context = context;
     /**
      * @type {DataModel}
      */
    this.model = model;
    if (_.isNil(context) && _.isObject(model)) {
        //get current context from DataModel.context property
        this.context = model.context;
    }
    /**
     * @type {*}
     */
    this.target = target;
}

FunctionContext.prototype.eval = function(expr, callback) {
    callback = callback || function() {};
    if (typeof expr !=='string') {
        callback(null);
        return;
    }
    var re = /(fn:)\s?(.*?)\s?\((.*?)\)/, expr1=expr;
    if (expr.indexOf('fn:')!==0) {
        expr1 = 'fn:' + expr1;
    }
    var match = re.exec(expr1);
    if (match) {
        var expr2eval;
        //check parameters (match[3])
        if (match[3].length===0) {
            expr2eval = expr1.replace(/(fn:)\s?(.*?)\s?\((.*?)\)/, '(function() { return this.$2(); });');
        }
        else {
            expr2eval = expr1.replace(/(fn:)\s?(.*?)\s?\((.*?)\)/, '(function() { return this.$2($3); });');
        }
        //evaluate expression
        try {
            var f = eval(expr2eval);
            var value1 = f.call(this);
            if (typeof value1 !== 'undefined' && value1 !== null && typeof value1.then === 'function') {
                value1.then(function(result) {
                    return callback(null, result);
                }).catch(function(err) {
                    callback(err);
                });
            }
            else {
                return callback(null, value1);
            }
        }
        catch(err) {
            callback(err);
        }
    }
    else {
        callback(new Error('Cannot evaluate expression.'));
    }

};
/**
 * Returns the current date and time
 * @returns {Promise<Date>}
 */
FunctionContext.prototype.now = function() {
    return new Promise(function(resolve) {
        return resolve(new Date());
    });
};
/**
 * Returns the current date
 * @returns {Promise<Date>}
 */
FunctionContext.prototype.today = function() {
    return new Promise(function(resolve) {
        return resolve(moment(new Date()).startOf('day').toDate());
    });
};
/**
 * @returns {Promise|*}
 */
FunctionContext.prototype.newid = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        self.model.context.db.selectIdentity(self.model.sourceAdapter, self.model.primaryKey, function(err, result) {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};

var UUID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

function newGuidInternal() {
    var chars = UUID_CHARS, uuid = [], i;
    // rfc4122, version 4 form
    var r;
    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';

    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (i = 0; i < 36; i++) {
        if (!uuid[i]) {
            r = 0 | Math.random()*16;
            uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r];
        }
    }
    return uuid.join('');
}
/**
 * @returns {Promise|*}
 */
FunctionContext.prototype.newGuid = function() {
    return new Promise(function(resolve, reject) {
        try {
            resolve(newGuidInternal());
        }
        catch(err) {
            reject(err)
        }
    });
};

/**
 * Generates a random integer value between the given minimum and maximum value
 * @param {number} min
 * @param {number} max
 * @returns {Promise<number>}
 */
FunctionContext.prototype.int = function(min, max) {
    return new Promise(function(resolve, reject) {
        try {
            resolve(_.random(min, max));
        }
        catch (err) {
            reject(err);
        }
    });
};

/**
 * Generates a random sequence of numeric characters
 * @param {number} length - A integer which represents the length of the sequence
 * @returns {Promise|*}
 */
FunctionContext.prototype.numbers = function(length) {

    return new Promise(function(resolve, reject) {
        try {
            length = length || 8;
            if (length<0) {
                return reject(new Error('Number sequence length must be greater than zero.'));
            }
            if (length>255) {
                return reject(new Error('Number sequence length exceeds the maximum of 255 characters.'));
            }
            var times = Math.ceil(length / 10);
            var res = '';
            _.times(times, function() {
                res += _.random(1000000000, 9000000000)
            });
            return resolve(res.substring(0,length));
        }
        catch (err) {
            reject(err);
        }
    });
};

/**
 * @param {number} length
 * @returns {Promise|*}
 */
FunctionContext.prototype.chars = function(length) {
    return new Promise(function(resolve, reject) {
        try {
            length = length || 8;
            var chars = 'abcdefghkmnopqursuvwxz2456789ABCDEFHJKLMNPQURSTUVWXYZ';
            var str = '';
            var rnd;
            for(var i = 0; i < length; i++) {
                rnd = _.random(0, chars.length - 1);
                str += chars.substring(rnd, rnd + 1);
            }
            resolve(str);
        }
        catch (err) {
            reject(err);
        }
    });
};
/**
 * @param {number} length
 * @returns {Promise<string>}
 */
FunctionContext.prototype.password = function(length) {
    return new Promise(function(resolve, reject) {
        try {
            length = length || 8;
            var specialChars = '%=+-!$()#@[]?{}^|';
            var chars = 'abcdefghkmnopqursuvwxz2456789ABCDEFHJKLMNPQURSTUVWXYZ';
            var str = '';
            var rnd = 0;
            var specialCharIndex = _.random(0, length-1)
            for(var i = 0; i < length; i++) {
                if (i === specialCharIndex) {
                    rnd = _.random(0, specialChars.length - 1);
                    str += specialChars.substring(rnd, rnd + 1);
                } else {
                    rnd = _.random(0, chars.length-1);
                    str += chars.substring(rnd, rnd + 1);
                }
            }
            resolve('{clear}' + str);
        }
        catch (err) {
            return reject(err);
        }
    });
};
/**
 * @returns {Promise<any>}
 */
FunctionContext.prototype.user = function() {
    var self = this;
    // backward compatibility issue (get FunctionContext.model.context first)
    var context = (self.model && self.model.context) || self.context;
    var user = context.interactiveUser || context.user || { };
    return new Promise(function(resolve) {
        if (typeof user.id !== 'undefined') {
            return resolve(user.id);
        }
        var userModel = context.model('User');
        var parser;
        var undefinedUser = null;
        userModel.where('name').equal(user.name).silent().select('id').first(function(err, result) {
            if (err) {
                TraceUtils.log(err);
                //try to get undefined user
                parser = TypeParser.hasParser(userModel.field('id').type);
                if (typeof parser === 'function')
                    undefinedUser = parser(null);
                //set id for next calls
                user.id = undefinedUser;
                if (context.user == null) {
                    context.user = user;
                }
                return resolve(undefinedUser);
            }
            else if (result == null) {
                //try to get undefined user
                parser = TypeParser.hasParser(userModel.field('id').type);
                if (typeof parser === 'function')
                    undefinedUser = parser(null);
                //set id for next calls
                user.id = undefinedUser;
                if (context.user == null) {
                    context.user = user;
                }
                return resolve(undefinedUser);
            }
            else {
                //set id for next calls
                user.id = result.id;
                return resolve(result.id);
            }
        });
    });
};
/**
 * @returns {Promise|*}
 */
FunctionContext.prototype.me = function() {
    return this.user();
};

/**
 * Creates a new instance of FunctionContext class
 * @param {DataContext|*=} context
 * @param {DataModel|*=} model
 * @param {*=} target
 * @returns FunctionContext
 */
function createContext(context, model, target) {
    return new FunctionContext(context, model, target);
}

module.exports = {
    createContext,
    FunctionContext
};

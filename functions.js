// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const {parsers} = require('./types');
const {TraceUtils} = require('@themost/common');
// eslint-disable-next-line no-unused-vars
const moment = require('moment');
const _ = require('lodash');
const Q = require('q');

/**
 * @class
 * @classdesc A utility class which offers a set of methods for calculating the default values of a data model
 * @param {DataContext=} context
 * @param {DataModel=} model
 * @param {*=} target
 * @constructor
*/
class FunctionContext {
    constructor(context, model, target) {
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

    /**
     * @param {*} expr
     * @param {function(err=:*)} callback
     * @returns *
     */
    eval(expr, callback) {
        callback = callback || function () { };
        if (typeof expr !== 'string') {
            callback(null);
            return;
        }
        let re = /(fn:)\s?(.*?)\s?\((.*?)\)/, expr1 = expr;
        if (expr.indexOf('fn:') !== 0) {
            expr1 = 'fn:' + expr1;
        }
        let match = re.exec(expr1);
        if (match) {
            let expr2eval;
            //check parameters (match[3])
            if (match[3].length === 0) {
                expr2eval = expr1.replace(/(fn:)\s?(.*?)\s?\((.*?)\)/, '(function() { return this.$2(); });');
            } else {
                expr2eval = expr1.replace(/(fn:)\s?(.*?)\s?\((.*?)\)/, '(function() { return this.$2($3); });');
            }
            //evaluate expression
            try {
                let f = eval(expr2eval);
                let value1 = f.call(this);
                if (typeof value1 !== 'undefined' && value1 !== null && typeof value1.then === 'function') {
                    value1.then(function (result) {
                        return callback(null, result);
                    }).catch(function (err) {
                        callback(err);
                    });
                } else {
                    return callback(null, value1);
                }
            } catch (err) {
                callback(err);
            }
        } else {
            TraceUtils.error('Cannot evaluate expression.', expr1);
            return callback(new Error('Cannot evaluate expression.'));
        }

    }
    /**
     * Returns the current date and time
     * @returns {Promise<Date>}
     */
    now() {
        return new Promise(function (resolve) {
            return resolve(new Date());
        });
    }
    /**
     * Returns the current date
     * @returns {Promise<Date>}
     */
    today() {
        return new Promise(function (resolve) {
            return resolve(new Date().getDate());
        });
    }
    /**
     * @returns {Promise|*}
     */
    newid() {
        let deferred = Q.defer();
        this.model.context.db.selectIdentity(this.model.sourceAdapter, this.model.primaryKey, function (err, result) {
            if (err) {
                return deferred.reject(err);
            }
            deferred.resolve(result);
        });
        return deferred.promise;
    }
    /**
     * @returns {Promise|*}
     */
    newGuid() {
        let deferred = Q.defer();
        process.nextTick(function () {
            try {
                deferred.resolve(newGuidInternal());
            } catch (err) {
                deferred.reject(err);
            }
        });
        return deferred.promise;
    }
    /**
     * Generates a random integer value between the given minimum and maximum value
     * @param {number} min
     * @param {number} max
     * @returns {Promise|*}
     */
    int(min, max) {
        let deferred = Q.defer();
        process.nextTick(function () {
            try {
                return deferred.resolve(_.random(min, max));
            } catch (err) {
                deferred.reject(err);
            }
            deferred.resolve((new Date()).getDate());
        });
        return deferred.promise;
    }
    /**
     * Generates a random sequence of numeric characters
     * @param {number} length - A integer which represents the length of the sequence
     * @returns {Promise|*}
     */
    numbers(length) {
        let deferred = Q.defer();
        process.nextTick(function () {
            try {
                length = length || 8;
                if (length < 0) {
                    return deferred.reject(new Error('Number sequence length must be greater than zero.'));
                }
                if (length > 255) {
                    return deferred.reject(new Error('Number sequence length exceeds the maximum of 255 characters.'));
                }
                let times = Math.ceil(length / 10);
                let res = '';
                _.times(times, function () {
                    res += _.random(1000000000, 9000000000);
                });
                return deferred.resolve(res.substr(0, length));
            } catch (err) {
                deferred.reject(err);
            }
        });
        return deferred.promise;
    }
    /**
     * @param {number} length
     * @returns {Promise|*}
     */
    chars(length) {

        let deferred = Q.defer();
        process.nextTick(function () {
            try {
                length = length || 8;
                let chars = 'abcdefghkmnopqursuvwxz2456789ABCDEFHJKLMNPQURSTUVWXYZ';
                let str = '';
                for (let i = 0; i < length; i++) {
                    str += chars.substr(_.random(0, chars.length - 1), 1);
                }
                deferred.resolve(str);
            } catch (err) {
                return deferred.reject(err);
            }
        });
        return deferred.promise;
    }
    /**
     * @param {number} length
     * @returns {Promise|*}
     */
    password(length) {
        let deferred = Q.defer();
        process.nextTick(function () {
            try {
                length = length || 8;
                let chars = 'abcdefghkmnopqursuvwxz2456789ABCDEFHJKLMNPQURSTUVWXYZ',
                    str = '';
                for (let i = 0; i < length; i++) {
                    str += chars.substr(_.random(0, chars.length - 1), 1);
                }
                deferred.resolve('{clear}' + str);
            } catch (err) {
                return deferred.reject(err);
            }
        });
        return deferred.promise;
    }
    /**
     * @returns {Promise|*}
     */
    user() {
        let self = this, context = self.model.context, deferred = Q.defer();
        let user = context.interactiveUser || context.user || {};
        process.nextTick(function () {
            if (typeof user.id !== 'undefined') {
                return deferred.resolve(user.id);
            }
            let userModel = context.model('User'), parser, undefinedUser = null;
            userModel.where('name').equal(user.name).silent().select('id').first(function (err, result) {
                if (err) {
                    TraceUtils.log(err);
                    //try to get undefined user
                    parser = parsers['parse' + userModel.field('id').type];
                    if (typeof parser === 'function') {
                        undefinedUser = parser(null);
                    }
                    //set id for next calls
                    user.id = undefinedUser;
                    if (_.isNil(context.user)) {
                        context.user = user;
                    }
                    return deferred.resolve(undefinedUser);
                } else if (_.isNil(result)) {
                    //try to get undefined user
                    parser = parsers['parse' + userModel.field('id').type];
                    if (typeof parser === 'function') {
                        undefinedUser = parser(null);
                    }
                    //set id for next calls
                    user.id = undefinedUser;
                    if (_.isNil(context.user)) {
                        context.user = user;
                    }
                    return deferred.resolve(undefinedUser);
                } else {
                    //set id for next calls
                    user.id = result.id;
                    return deferred.resolve(result.id);
                }
            });
        });
        return deferred.promise;
    }
    /**
     * @returns {Promise|*}
     */
    me() {
        return this.user();
    }
}


let UUID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

function newGuidInternal() {
    let chars = UUID_CHARS, uuid = [], i;
    // rfc4122, version 4 form
    let r;
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

module.exports = {
    FunctionContext
};

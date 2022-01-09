// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const {parsers} = require('./types');
const {sprintf} = require('sprintf-js');
const {TraceUtils, Guid} = require('@themost/common');
const _ = require('lodash');

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
        if (model != null) {
            //get current context from DataModel.context property
            this.context = model.context;
        }
        /**
         * @type {*}
         */
        this.target = target;
    }
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
                expr2eval = expr1.replace(/(fn:)\s?(.*?)\s?\((.*?)\)/, "(function() { return this.$2(); });");
            } else {
                expr2eval = expr1.replace(/(fn:)\s?(.*?)\s?\((.*?)\)/, "(function() { return this.$2($3); });");
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
            TraceUtils.error(sprintf('Cannot evaluate %s.', expr1));
            callback(new Error('Cannot evaluate expression.'));
        }

    }
    now() {
        return new Promise(function (resolve) {
            return resolve(new Date());
        });
    }
    today() {
        return new Promise(function (resolve) {
            return resolve(new Date().getDate());
        });
    }
    /**
     * @returns {Promise|*}
     */
    newid() {
        const self = this;
        return new Promise(function(resolve, reject) {
            return self.model.context.db.selectIdentity(self.model.sourceAdapter, self.model.primaryKey, function (err, result) {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });
    }
    /**
     * @returns {Promise|*}
     */
    newGuid() {
        return new Promise(function (resolve, reject) {
            try {
                return resolve(Guid.newGuid());
            } catch (error) {
                return reject(error);
            }
        });
    }
    /**
     * Generates a random integer value between the given minimum and maximum value
     * @param {number} min
     * @param {number} max
     * @returns {Promise|*}
     */
    int(min, max) {
        return new Promise(function (resolve, reject) {
            try {
                return resolve(_.random(min, max));
            } catch (error) {
                return reject(error);
            }
        });
    }
    /**
     * Generates a random sequence of numeric characters
     * @param {number} length - A integer which represents the length of the sequence
     * @returns {Promise|*}
     */
    numbers(length) {
        return new Promise(function (resolve, reject) {
            try {
                length = length || 8;
                if (length < 0) {
                    return reject(new Error("Number sequence length must be greater than zero."));
                }
                if (length > 255) {
                    return reject(new Error("Number sequence length exceeds the maximum of 255 characters."));
                }
                let times = Math.ceil(length / 10);
                let res = '';
                _.times(times, function () {
                    res += _.random(1000000000, 9000000000);
                });
                return resolve(res.substr(0, length));
            } catch (err) {
                reject(err);
            }
        });
    }
    /**
     * @param {number} length
     * @returns {Promise|*}
     */
    chars(length) {

        return new Promise(function (resolve, reject) {
            try {
                length = length || 8;
                let chars = "abcdefghkmnopqursuvwxz2456789ABCDEFHJKLMNPQURSTUVWXYZ";
                let str = "";
                for (let i = 0; i < length; i++) {
                    str += chars.substr(_.random(0, chars.length - 1), 1);
                }
                resolve(str);
            } catch (err) {
                return reject(err);
            }
        });
    }
    /**
     * @param {number} length
     * @returns {Promise|*}
     */
    password(length) {
        return new Promise(function (resolve, reject) {
            try {
                length = length || 8;
                let chars = "abcdefghkmnopqursuvwxz2456789ABCDEFHJKLMNPQURSTUVWXYZ", str = "";
                for (let i = 0; i < length; i++) {
                    str += chars.substr(_.random(0, chars.length - 1), 1);
                }
                return resolve('{clear}' + str);
            } catch (err) {
                return reject(err);
            }
        });
    }
    /**
     * @returns {Promise|*}
     */
    user() {
        const self = this;
        const context = self.model.context;
        const user = context.interactiveUser || context.user || {};
        return new Promise(function (resolve) {
            if (user && user.id) {
                return resolve(user.id);
            }
            let userModel = context.model('User'), parser, undefinedUser = null;
            userModel.where('name').equal(user.name).silent().select('id').first(function (err, result) {
                if (err) {
                    TraceUtils.error(err);
                    //try to get undefined user
                    parser = parsers['parse' + userModel.field('id').type];
                    if (typeof parser === 'function')
                        undefinedUser = parser(null);
                    //set id for next calls
                    user.id = undefinedUser;
                    if (_.isNil(context.user)) {
                        context.user = user;
                    }
                    return resolve(undefinedUser);
                } else if (_.isNil(result)) {
                    //try to get undefined user
                    parser = parsers['parse' + userModel.field('id').type];
                    if (typeof parser === 'function')
                        undefinedUser = parser(null);
                    //set id for next calls
                    user.id = undefinedUser;
                    if (_.isNil(context.user)) {
                        context.user = user;
                    }
                    return resolve(undefinedUser);
                } else {
                    //set id for next calls
                    user.id = result.id;
                    return resolve(result.id);
                }
            });
        });
    }
    /**
     * @returns {Promise|*}
     */
    me() {
        return this.user();
    }
}

module.exports = {
    FunctionContext
};

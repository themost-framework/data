// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const {FunctionContext} = require('./functions');


class DataFilterResolver {
    constructor() {
        //
    }
    resolveMember(member, callback) {
        if (/\//.test(member)) {
            let arr = member.split('/');
            callback(null, arr.slice(arr.length - 2).join('.'));
        } else {
            callback(null, this.viewAdapter.concat('.', member));
        }
    }
    resolveMethod(name, args, callback) {
        callback = callback || function () { };
        if (typeof DataFilterResolver.prototype[name] === 'function') {
            let a = args || [];
            a.push(callback);
            try {
                return DataFilterResolver.prototype[name].apply(this, a);
            } catch (e) {
                return callback(e);
            }
        }
        callback();
    }
    /**
     * @param {Function} callback
     */
    me(callback) {
        let fx = new FunctionContext(this.context, this);
        fx.user().then(function (value) {
            callback(null, value);
        }).catch(function (err) {
            callback(err);
        });
    }
    user(callback) {
        return this.me(callback);
    }
    /**
     * @param {Function} callback
     */
    now(callback) {
        callback(null, new Date());
    }
    /**
     * @param {Function} callback
     */
    today(callback) {
        let res = new Date();
        res.setHours(0, 0, 0, 0);
        callback(null, res);
    }
    /**
     * @param {Function} callback
     */
    lang(callback) {
        let culture = this.context.culture();
        if (culture) {
            return callback(null, culture.substr(0, 2));
        } else {
            return callback(null, 'en');
        }
    }
}


module.exports = {
    DataFilterResolver
};

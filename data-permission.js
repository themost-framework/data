// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
/*eslint no-var: "off"*/
// noinspection ES6ConvertVarToLetConst

var { QueryEntity } = require('@themost/query');
var { QueryUtils } = require('@themost/query');
var async = require('async');
var { AccessDeniedError } = require('@themost/common');
var { DataConfigurationStrategy } = require('./data-configuration');
var _ = require('lodash');
var { DataCacheStrategy } = require('./data-cache');
var Q = require('q');
var { hasOwnProperty } = require('./has-own-property');
var { at } = require('lodash');
var { DataModelFilterParser } = require('./data-model-filter.parser');

/**
 * @class
 * @constructor
 * @private
 * @ignore
 */
function EachSeriesCancelled() {
    //
}

/**
 * @class
 * @constructor
 */
function DataPermissionEventArgs() {
    /**
     * The target data model
     * @type {DataModel}
     */
    this.model = null;
    /**
     * The underlying query expression
     * @type {QueryExpression}
     */
    this.query = null;
    /**
     * The permission mask
     * @type {Number}
     */
    this.mask = null;
    /**
     * The query type
     * @type {String}
     */
    this.type = null;
    /**
     * The query type
     * @type {String}
     */
    this.privilege = null;
    /**
     * The data queryable object that emits the event.
     * @type {DataQueryable|*}
     */
    this.emitter = null;
}
/**
 * An enumeration of the available permission masks
 * @enum {number}
 */
function PermissionMask() {

}

/**
 * Read Access Mask (1)
 * @type {number}
 */
PermissionMask.Read = 1;
/**
 * Create Access Mask (2)
 * @type {number}
 */
PermissionMask.Create = 2;
/**
 * Update Access Mask (4)
 * @type {number}
 */
PermissionMask.Update = 4;
/**
 * Delete Access Mask (8)
 * @type {number}
 */
PermissionMask.Delete = 8;
/**
 * Execute Access Mask (16)
 * @type {number}
 */
PermissionMask.Execute = 16;
/**
 * Full Access Mask (31)
 * @type {number}
 */
PermissionMask.Owner = 31;

/**
 * Splits a comma-separated or space-separated scope string e.g. "profile email" or "profile,email"
 * 
 * Important note: https://www.rfc-editor.org/rfc/rfc6749#section-3.3 defines the regular expression of access token scopes
 * which is a space separated string. Several OAuth2 servers use a comma-separated list instead.
 * 
 * The operation will try to use both implementations by excluding comma ',' from access token regular expressions
 * @param {string} str
 * @returns {Array<string>}
 */
function splitScope(str) {
    // the default regular expression includes comma /([\x21\x23-\x5B\x5D-\x7E]+)/g
    // the modified regular expression excludes comma /x2C /([\x21\x23-\x2B\x2D-\x5B\x5D-\x7E]+)/g
    const re = /([\x21\x23-\x2B\x2D-\x5B\x5D-\x7E]+)/g
    let match;
    const results = [];
    while((match = re.exec(str)) !== null) {
        results.push(match[0]);
    }
    return results;
}

/**
 * 
 * @param {import("./data-model").DataModel} model 
 */
function DataPermissionExclusion(model) {
    this.model = model;
}
/**
 * @param {import("./types").DataModelPrivilege} privilege 
 * @param {function(Error=,boolean=)} callback
 */
DataPermissionExclusion.prototype.shouldExclude = function (privilege, callback) {
    if (privilege == null) {
        return callback(new Error('Data model privilege may not be null'));
    }
    if (privilege.exclude == null) {
        return callback();
    }
    if (typeof privilege.exclude !== 'string') {
        return callback(new TypeError('Exclude expression must be a string'));
    }
    if (privilege.exclude.trim().length === 0) {
        return callback();
    }
    var context = this.model.context;
    var users = context.model('User');
    var parser = new DataModelFilterParser(users);
    var username = (context.user && context.user.name) || 'anonymous';
    var addSelect = [
        {
            name: {
                $value: username
            }
        }
    ];
    parser.resolvingMember.subscribe(function (event) {
        var propertyPath = event.member.split('/');
        if (propertyPath[0] === 'context') {
            propertyPath.splice(0, 1);
            var property = at(context, propertyPath.join('.'))[0];
            var propertyName = propertyPath[propertyPath.length - 1];
            var exists = addSelect.findIndex((item) => Object.prototype.hasOwnProperty.call(item, propertyPath));
            if (exists < 0) {
                var select = {};
                Object.defineProperty(select, propertyName, {
                    enumerable: true,
                    configurable: true,
                    value: {
                        $value: property
                    }
                });
                addSelect.push(select);
            }
            event.result = {
                $select: propertyName
            }
        }
    });
    void parser.parseAsync(privilege.exclude).then(function (q) {
        var q1 = users.asQueryable();
        q1.query.select([].concat(addSelect));
        Object.assign(q1.query, {
            $expand: q.$expand,
            $where: q.$where
        });
        q1.query.prepare().where('name').equal(username);
        void context.db.execute(q1.query, [], function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.length > 0);
        });
    }).catch(function (err) {
        return callback(err);
    });
};
/**
 * @param {import("./types").DataModelPrivilege} privilege 
 * @param {function(Error=,boolean=)} callback
 */
DataPermissionExclusion.prototype.shouldExcludeAsync = function (privilege) {
    var self = this;
    return new Promise(function(resolve, reject) {
        void self.shouldExclude(privilege, function(err, result) {
            if (err) {
                return reject(err);
            }
            return resolve(result);
        });
    });
};
/**
 * 
 * @param {import("./types").DataModelPrivilege} privilege 
 */
DataPermissionExclusion.prototype.tryExclude = function(privilege) {
    var context = this.model.context;
    if (privilege == null) {
        throw new Error('Privilege may not be null');
    }
    if (privilege.scope == null) {
        return false;
    }
    if (Array.isArray(privilege.scope) === false) {
        throw new TypeError('Privilege scope must be an array');
    }
    // get context scopes
    const authenticationScope = context.user && context.user.authenticationScope;
    if (authenticationScope == null) {
        return false;
    }
    // get context scopes as array e.g. "profile", "email", "sales"
    var scopes = [];
    if (typeof authenticationScope === 'string') {
        // check for space separated
        scopes = splitScope(authenticationScope);
    } else if (Array.isArray(authenticationScope)) {
        scopes = authenticationScope.slice();
    }
    // search privilege scopes e.g. "sales", "orders"
    var find = privilege.scope.find(function(scope) {
        return scopes.includes(scope);
    });
    // if there is no scope defined, privilege should be excluded
    return find == null;
}

/**
 * @class
 * @constructor
 */
function DataPermissionEventListener() {
    //
}
/**
 * Occurs before creating or updating a data object.
 * @param {DataEventArgs} event - An object that represents the event arguments passed to this operation.
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
 */
DataPermissionEventListener.prototype.beforeSave = function (event, callback) {
    DataPermissionEventListener.prototype.validate(event, callback);
};
/**
 * Occurs before removing a data object.
 * @param {DataEventArgs} event - An object that represents the event arguments passed to this operation.
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
 * @returns {DataEventListener}
 */
DataPermissionEventListener.prototype.beforeRemove = function (event, callback) {
    DataPermissionEventListener.prototype.validate(event, callback);
};
/**
 * Validates permissions against the event arguments provided.
 * @param {DataEventArgs|DataPermissionEventArgs} event - An object that represents the event arguments passed to this operation.
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
 */
DataPermissionEventListener.prototype.validate = function (event, callback) {
    var model = event.model;
    /**
     * @type {DataContext|*}
     */
    var context = event.model.context;
    var requestMask = 1;
    var workspace = 1;
    //ensure silent operation
    if (event.model && event.model.$silent) {
        return callback();
    }
    if (event.state === 0)
        requestMask = PermissionMask.Read;
    else if (event.state === 1)
        requestMask = PermissionMask.Create;
    else if (event.state === 2)
        requestMask = PermissionMask.Update;
    else if (event.state === 4)
        requestMask = PermissionMask.Delete;
    else if (event.state === 16)
        requestMask = PermissionMask.Execute;
    else {
        if (event.mask) {
            // use mask defined by event arguments
            requestMask = event.mask;
        }
        else {
            // throw error
            return callback(new Error('Target object has an invalid state.'));
        }
    }
    // use privilege defined by event arguments
    var privilege = model.name;
    var parentPrivilege = null;
    if (event.privilege) {
        privilege = event.privilege;
    }
    //validate throwError
    if (typeof event.throwError === 'undefined')
        event.throwError = true;
    context.user = context.user || { name: 'anonymous', authenticationType: 'None' };
    //description: Use unattended execution account as an escape permission check account
    var authSettings = context.getConfiguration().getStrategy(DataConfigurationStrategy).getAuthSettings();
    if (authSettings) {
        var unattendedExecutionAccount = authSettings.unattendedExecutionAccount;
        if ((typeof unattendedExecutionAccount !== 'undefined'
            || unattendedExecutionAccount != null)
            && (unattendedExecutionAccount === context.user.name)) {
            event.result = true;
            return callback();
        }
    }
    //get user key
    var users = context.model('User');
    if (users == null) {
        //do nothing
        return callback();
    }
    var permissions = context.model('Permission');
    if (permissions == null) {
        //do nothing
        return callback();
    }
    effectiveAccounts(context, function (err, accounts) {
        if (err) {
            return callback(err);
        }
        var permEnabled = model.privileges.filter(function (x) { return !x.disabled; }, model.privileges).length > 0;
        //get all enabled privileges
        var privileges = model.privileges.filter(function (x) { return !x.disabled && ((x.mask & requestMask) === requestMask) });
        if (privileges.length === 0) {
            if (event.throwError) {
                //if the target model has privileges but it has no privileges with the requested mask
                if (permEnabled) {
                    //throw error
                    var error = new Error('Access denied.');
                    error.statusCode = 401;
                    return callback(error);
                }
                else {
                    //do nothing
                    return callback();
                }
            }
            else {
                //set result to false (or true if model has no privileges at all)
                event.result = !permEnabled;
                //and exit
                return callback();
            }
        }
        else {
            var cancel = false;
            event.result = false;
            //enumerate privileges
            async.eachSeries(privileges, function (item, cb) {
                if (cancel) {
                    return cb();
                }
                try {
                    var exclude = new DataPermissionExclusion(model).tryExclude(item);
                    if (exclude) {
                        return cb();
                    }
                    //global
                    if (item.type === 'global') {
                        if (typeof item.account !== 'undefined') {
                            //check if a privilege is assigned by the model
                            if (item.account === '*') {
                                //get permission and exit
                                cancel = true;
                                event.result = true;
                                return cb();
                            }
                            else if (hasOwnProperty(item, 'account')) {
                                if (accounts.findIndex(function (x) { return x.name === item.account }) >= 0) {
                                    cancel = true;
                                    event.result = true;
                                    return cb();
                                }
                            }
                        }
                        //try to find user has global permissions assigned
                        permissions.where('privilege').equal(privilege)
                            .and('parentPrivilege').equal(null)
                            .and('target').equal('0')
                            .and('workspace').equal(workspace)
                            .and('account').in(accounts.map(function (x) { return x.id; }))
                            .and('mask').bit(requestMask, requestMask).silent().count(function (err, count) {
                                if (err) {
                                    return cb(err);
                                }
                                else {
                                    if (count >= 1) {
                                        cancel = true;
                                        event.result = true;
                                    }
                                    return cb();
                                }
                            });
                    }
                    else if (item.type === 'parent') {
                        var mapping = model.inferMapping(item.property);
                        if (!mapping) {
                            return cb();
                        }
                        // validate parent association
                        if (mapping.childModel !== model.name) {
                            return cb(new Error('Parent privileges are assigned by a wrong type of association.'))
                        }
                        // use parentPrivilege provided by arguments
                        parentPrivilege = mapping.parentModel;
                        if (event.parentPrivilege) {
                            parentPrivilege = event.parentPrivilege;
                        }
                        if (requestMask === PermissionMask.Create) {
                            permissions.where('privilege').equal(privilege)
                                .and('parentPrivilege').equal(parentPrivilege)
                                .and('target').equal(event.target[mapping.childField])
                                .and('workspace').equal(workspace)
                                .and('account').in(accounts.map(function (x) { return x.id; }))
                                .and('mask').bit(requestMask, requestMask).silent().count(function (err, count) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    else {
                                        if (count >= 1) {
                                            cancel = true;
                                            event.result = true;
                                        }
                                        return cb();
                                    }
                                });
                        }
                        else {
                            //get original value
                            model.where(model.primaryKey).equal(event.target[model.primaryKey]).select(mapping.childField).first(function (err, result) {
                                if (err) {
                                    cb(err);
                                }
                                else if (result) {
                                    permissions.where('privilege').equal(privilege)
                                        .and('parentPrivilege').equal(parentPrivilege)
                                        .and('target').equal(result[mapping.childField])
                                        .and('workspace').equal(workspace)
                                        .and('account').in(accounts.map(function (x) { return x.id; }))
                                        .and('mask').bit(requestMask, requestMask).silent().count(function (err, count) {
                                            if (err) {
                                                return cb(err);
                                            }
                                            else {
                                                if (count >= 1) {
                                                    cancel = true;
                                                    event.result = true;
                                                }
                                                return cb();
                                            }
                                        });
                                }
                                else {
                                    return cb();
                                }
                            });
                        }
                    }
                    else if (item.type === 'item') {
                        //if target object is a new object
                        if (requestMask === PermissionMask.Create) {
                            //do nothing
                            return cb();
                        }
                        permissions.where('privilege').equal(privilege)
                            .and('parentPrivilege').equal(null)
                            .and('target').equal(event.target[model.primaryKey])
                            .and('workspace').equal(workspace)
                            .and('account').in(accounts.map(function (x) { return x.id; }))
                            .and('mask').bit(requestMask, requestMask).silent().count(function (err, count) {
                                if (err) {
                                    return cb(err);
                                }
                                else {
                                    if (count >= 1) {
                                        cancel = true;
                                        event.result = true;
                                    }
                                    return cb();
                                }
                            });
                    }
                    else if (item.type === 'self') {
                        // check if the specified privilege has account attribute
                        if (typeof item.account !== 'undefined' && item.account !== null && item.account !== '*') {
                            // if user does not have this account return
                            if (accounts.findIndex(function (x) { return x.name === item.account; }) < 0) {
                                return cb();
                            }
                        }
                        // validate permission exclusion
                        new DataPermissionExclusion(model).shouldExclude(item, function(err, exclude) {
                            if (err) {
                                return cb(err);
                            }
                            // if privilege should be excluded
                            if (exclude === true) {
                                // break
                                return cb;
                            }
                            // otherwise, continue with permission validation
                            if (requestMask === PermissionMask.Create) {
                                var query = QueryUtils.query(model.viewAdapter);
                                var fields = [], field;
                                //cast target
                                var name, obj = event.target;
                                model.attributes.forEach(function (x) {
                                    name = hasOwnProperty(obj, x.property) ? x.property : x.name;
                                    if (hasOwnProperty(obj, name)) {
                                        var mapping = model.inferMapping(name);
                                        if (_.isNil(mapping)) {
                                            field = {};
                                            field[x.name] = { $value: obj[name] };
                                            fields.push(field);
                                        }
                                        else if ((mapping.associationType === 'association') && (mapping.childModel === model.name)) {
                                            if (typeof obj[name] === 'object' && obj[name] !== null) {
                                                //set associated key value (event.g. primary key value)
                                                field = {};
                                                field[x.name] = { $value: obj[name][mapping.parentField] };
                                                fields.push(field);
                                            }
                                            else {
                                                //set raw value
                                                field = {};
                                                field[x.name] = { $value: obj[name] };
                                                fields.push(field);
                                            }
                                        }
                                    }
                                });
                                //add fields
                                query.select(fields);
                                //set fixed query
                                query.$fixed = true;
                                model.filter(item.filter, function (err, q) {
                                    if (err) {
                                        cb(err);
                                    }
                                    else {
                                        //set where from DataQueryable.query
                                        query.$where = q.query.$prepared;
                                        query.$expand = q.query.$expand;
                                        model.context.db.execute(query, null, function (err, result) {
                                            if (err) {
                                                return cb(err);
                                            }
                                            else {
                                                if (result.length === 1) {
                                                    cancel = true;
                                                    event.result = true;
                                                }
                                                return cb();
                                            }
                                        });
                                    }
                                });
                            } else {
                                //get privilege filter
                                model.filter(item.filter, function (err, q) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    else {
                                        //prepare query and append primary key expression
                                        q.where(model.primaryKey).equal(event.target[model.primaryKey]).silent().count(function (err, count) {
                                            if (err) { cb(err); return; }
                                            if (count >= 1) {
                                                cancel = true;
                                                event.result = true;
                                            }
                                            return cb();
                                        })
                                    }
                                });
                            }
                        });
                    }
                    else {
                        //do nothing (unknown permission)
                        return cb();
                    }
                } catch (error) {
                    return cb(error);
                }
            }, function (err) {
                // return error
                if (err) {
                    return callback(err);
                }
                // if user has access
                if (event.result === true) {
                    return callback();
                }
                // if process should throw an error
                if (event.throwError) {
                    // throw an access denied error
                    return callback(Object.assign(new AccessDeniedError(), {
                        model: model.name
                    }));
                }
                // otherwise, return result
                return callback(null, event.result);
            });
        }

    });
};
/**
 * @private
 * @type {string}
 */
var ANONYMOUS_USER_CACHE_PATH = '/User/anonymous';
/**
 * @param {DataContext} context
 * @param {function(Error=,*=)} callback
 * @private
 */
function anonymousUser(context, callback) {
    queryUser(context, 'anonymous', function (err, result) {
        if (err) {
            callback(err);
        }
        else {
            callback(null, result || { id: null, name: 'anonymous', groups: [], enabled: false });
        }
    });
}
/**
 *
 * @param {DataContext} context
 * @param {string} username
 * @param {function(Error=,*=)} callback
 * @private
 */
function queryUser(context, username, callback) {
    try {
        if (_.isNil(context)) {
            return callback();
        }
        var users = context.model('User');
        if (_.isNil(users)) {
            return callback();
        }
        users.where('name').equal(username).silent().select('id', 'name').expand('groups').getTypedItem().then(function (result) {
            return callback(null, result);
        }).catch(function (err) {
            return callback(err);
        });
    }
    catch (err) {
        callback(err);
    }
}
/**
 * @param {DataContext} context
 * @param {function(Error=,Array=)} callback
 * @private
 */
function effectiveAccounts(context, callback) {
    if (_.isNil(context)) {
        //push no account
        return callback(null, [{ id: null }]);
    }

    /**
     * @type {DataCacheStrategy}
     */
    var cache = context.getConfiguration().getStrategy(DataCacheStrategy);
    /**
     * Gets or sets an object that represents the user of the current data context.
     * @property {*|{name: string, authenticationType: string}}
     * @name DataContext#user
     * @memberof DataContext
     */
    context.user = context.user || { name: 'anonymous', authenticationType: 'None' };
    context.user.name = context.user.name || 'anonymous';
    //if the current user is anonymous
    if (context.user.name === 'anonymous') {
        //get anonymous user data
        cache.getOrDefault(ANONYMOUS_USER_CACHE_PATH, function () {
            return Q.nfbind(anonymousUser)(context);
        }).then(function (result) {
            var arr = [];
            if (result) {
                arr.push({ 'id': result.id, 'name': result.name });
                result.groups = result.groups || [];
                result.groups.forEach(function (x) { arr.push({ 'id': x.id, 'name': x.name }); });
            }
            if (arr.length === 0)
                arr.push({ id: null });
            return callback(null, arr);
        }).catch(function (err) {
            return callback(err);
        });
    }
    else {
        //try to get data from cache
        var USER_CACHE_PATH = '/User/' + context.user.name;

        cache.getOrDefault(USER_CACHE_PATH, function () {
            return Q.nfbind(queryUser)(context, context.user.name);
        }).then(function (user) {
            return cache.getOrDefault(ANONYMOUS_USER_CACHE_PATH, function () {
                return Q.nfbind(anonymousUser)(context);
            }).then(function (anonymous) {
                var arr = [];
                if (user) {
                    arr.push({ 'id': user.id, 'name': user.name });
                    if (_.isArray(user.groups))
                        user.groups.forEach(function (x) { arr.push({ 'id': x.id, 'name': x.name }); });
                }
                if (anonymous) {
                    arr.push({ 'id': anonymous.id, 'name': 'anonymous' });
                    if (_.isArray(anonymous.groups))
                        anonymous.groups.forEach(function (x) { arr.push({ 'id': x.id, 'name': x.name }); });
                }
                if (arr.length === 0)
                    arr.push({ id: null });
                return callback(null, arr);
            });
        }).catch(function (err) {
            return callback(err);
        });
    }
}

/**
 * Occurs before executing a data operation.
 * @param {DataEventArgs} event - An object that represents the event arguments passed to this operation.
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
 */
DataPermissionEventListener.prototype.beforeExecute = function (event, callback) {
    if (_.isNil(event.model)) {
        return callback();
    }
    //ensure silent query operation
    if (event.emitter && event.emitter.$silent) {
        callback();
        return;
    }
    var model = event.model;
    /**
     * @type {DataContext|*}
     */
    var context = event.model.context;
    var requestMask = 1;
    var workspace = 1;
    // eslint-disable-next-line no-unused-vars
    var privilege = model.name;
    // eslint-disable-next-line no-unused-vars
    var parentPrivilege = null;
    //get privilege from event arguments if it's defined (event.g. the operation requests execute permission User.ChangePassword where
    // privilege=ChangePassword and parentPrivilege=User)
    if (event.privilege) {
        //event argument is the privilege
        privilege = event.privilege;
        //and model is the parent privilege
        parentPrivilege = model.name;
    }
    //do not check permissions if the target model has no privileges defined
    if (model.privileges.filter(function (x) { return !x.disabled; }, model.privileges).length === 0) {
        callback(null);
        return;
    }
    //infer permission mask
    if (typeof event.mask !== 'undefined') {
        requestMask = event.mask;
    }
    else {
        if (event.query) {
            //infer mask from query type
            if (event.query.$select)
                //read permissions
                requestMask = 1;
            else if (event.query.$insert)
                //create permissions
                requestMask = 2;
            else if (event.query.$update)
                //update permissions
                requestMask = 4;
            else if (event.query.$delete)
                //delete permissions
                requestMask = 8;
        }
    }
    //ensure context user
    context.user = context.user || { name: 'anonymous', authenticationType: 'None' };
    //change: 2-May 2015
    //description: Use unattended execution account as an escape permission check account
    var authSettings = context.getConfiguration().getStrategy(DataConfigurationStrategy).getAuthSettings();
    if (authSettings) {
        var unattendedExecutionAccount = authSettings.unattendedExecutionAccount;
        if ((typeof unattendedExecutionAccount !== 'undefined'
            || unattendedExecutionAccount !== null)
            && (unattendedExecutionAccount === context.user.name)) {
            return callback();
        }
    }
    if (event.query) {
        //get user key
        var users = context.model('User');
        var permissions = context.model('Permission');
        if (users == null) {
            //do nothing
            return callback();
        }
        if (permissions == null) {
            //do nothing
            return callback();
        }
        //get model privileges (and clone them)
        var modelPrivileges = _.cloneDeep(model.privileges || []);
        // if there are no privileges
        if (modelPrivileges.length === 0) {
            // add defaults
            modelPrivileges.push.apply(modelPrivileges, [
                {
                    type: 'global',
                    mask: 31 // read, insert, update, delete and execute 
                }
            ]);
        }
        // validate current emitter view
        if (event.emitter && event.emitter.$view) {
            // get array
            const viewPrivileges = event.emitter.$view.privileges || [];
            if (viewPrivileges.length) {
                // initialize privileges
                modelPrivileges = [
                    {
                        type: 'global',
                        mask: 31 // read, insert, update, delete and execute 
                    }
                ];
                // set parent privilege e.g. Order
                parentPrivilege = model.name;
                // set privilege e.g. Delivered
                privilege = event.emitter.$view.name;
                // and append view privileges
                modelPrivileges.push.apply(modelPrivileges, viewPrivileges);
            }
        }
        //if model has no privileges defined
        if (modelPrivileges.length === 0) {
            //do nothing and exit
            return callback();
        }
        //tuning up operation
        //validate request mask permissions against all users privilege { mask:<requestMask>,disabled:false,account:"*" }
        var allUsersPrivilege = modelPrivileges.find(function (x) {
            return (((x.mask & requestMask) === requestMask) && !x.disabled && (x.account === '*'));
        });
        if (typeof allUsersPrivilege !== 'undefined') {
            //do nothing
            return callback();
        }

        effectiveAccounts(context, function (err, accounts) {
            if (err) { callback(err); return; }
            //get all enabled privileges
            var privileges = modelPrivileges.filter(function (x) {
                return !x.disabled && ((x.mask & requestMask) === requestMask);
            });

            // set query lastIndex
            event.query.$lastIndex = parseInt(event.query.$lastIndex, 10) || 0;
            var cancel = false, assigned = false, entity = new QueryEntity(model.viewAdapter), expand = null,
                perms1 = new QueryEntity(permissions.viewAdapter).as(permissions.viewAdapter + event.query.$lastIndex.toString()), expr = null;
            async.eachSeries(privileges, function (item, cb) {
                if (cancel) {
                    return cb();
                }
                try {
                    var exclude = new DataPermissionExclusion(model).tryExclude(item);
                    if (exclude) {
                        return cb();
                    }
                    if (item.type === 'global') {
                        //check if a privilege is assigned by the model
                        if (item.account === '*') {
                            //get permission and exit
                            assigned = true;
                            return cb(new EachSeriesCancelled());
                        }
                        else if (hasOwnProperty(item, 'account')) {
                            if (accounts.findIndex(function (x) { return x.name === item.account }) >= 0) {
                                assigned = true;
                                return cb(new EachSeriesCancelled());
                            }
                        }
                        //try to find user has global permissions assigned
                        permissions.where('privilege').equal(privilege).
                            and('parentPrivilege').equal(parentPrivilege).
                            and('target').equal('0').
                            and('workspace').equal(1).
                            and('account').in(accounts.map(function (x) { return x.id; })).
                            and('mask').bit(requestMask, requestMask).silent().count(function (err, count) {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    if (count >= 1) {
                                        assigned = true;
                                        return cb(new EachSeriesCancelled());
                                    }
                                    cb();
                                }
                            });
                    }
                    else if (item.type === 'parent') {
                        //get field mapping
                        var mapping = model.inferMapping(item.property);
                        if (!mapping) {
                            return cb();
                        }
                        if (_.isNil(expr))
                            expr = QueryUtils.query();
                        expr.where(entity.select(mapping.childField)).equal(perms1.select('target')).
                            and(perms1.select('privilege')).equal(mapping.childModel).
                            and(perms1.select('parentPrivilege')).equal(mapping.parentModel).
                            and(perms1.select('workspace')).equal(workspace).
                            and(perms1.select('mask')).bit(requestMask, requestMask).
                            and(perms1.select('account')).in(accounts.map(function (x) { return x.id; })).prepare(true);
                        assigned = true;
                        cb();
                    }
                    else if (item.type === 'item') {
                        if (_.isNil(expr))
                            expr = QueryUtils.query();
                        expr.where(entity.select(model.primaryKey)).equal(perms1.select('target')).
                            and(perms1.select('privilege')).equal(model.name).
                            and(perms1.select('parentPrivilege')).equal(null).
                            and(perms1.select('workspace')).equal(workspace).
                            and(perms1.select('mask')).bit(requestMask, requestMask).
                            and(perms1.select('account')).in(accounts.map(function (x) { return x.id; })).prepare(true);
                        assigned = true;
                        cb();
                    }
                    else if (item.type === 'self') {
                        // check if the specified privilege has account attribute
                        if (typeof item.account !== 'undefined' && item.account !== null && item.account !== '*') {
                            // if user does not have this account return
                            if (accounts.findIndex(function (x) { return x.name === item.account; }) < 0) {
                                return cb();
                            }
                        }
                        if (typeof item.filter === 'string') {
                            model.filter(item.filter, function (err, q) {
                                if (err) {
                                    return cb(err);
                                }
                                else {
                                    if (q.query.$prepared) {
                                        if (_.isNil(expr))
                                            expr = QueryUtils.query();
                                        expr.$where = q.query.$prepared;
                                        if (q.query.$expand) {
                                            // combine expands
                                            expand = expand || [];
                                            expand.push.apply(expand, q.query.$expand);
                                        }
                                        expr.prepare(true);
                                        assigned = true;
                                        return cb();
                                    }
                                    else
                                        return cb();
                                }
                            });
                        } else {
                            return cb();
                        }
                    }
                    else {
                        cb();
                    }
                }
                catch (e) {
                    cb(e);
                }
            }, function (err) {
                if (err) {
                    cancel = (err instanceof EachSeriesCancelled);
                    if (!cancel) {
                        return callback(err);
                    }
                }
                if (!assigned) {
                    //prepare no access query
                    event.query.prepare();
                    //add no record parameter
                    event.query.where(event.model.fieldOf(event.model.primaryKey)).equal(null).prepare();
                    return callback();
                }
                else if (expr) {
                    return context.model('Permission').migrate(function (err) {
                        if (err) { return callback(err); }
                        var q = QueryUtils.query(model.viewAdapter).select([model.primaryKey]).distinct();
                        if (expand) {
                            var arrExpand = [].concat(expand);
                            _.forEach(arrExpand, function (x) {
                                q.join(x.$entity).with(x.$with);
                            });
                        }
                        q.join(perms1).with(expr);
                        // set static alias
                        event.query.$lastIndex += 1;
                        var pqAlias = context.model('Permission').viewAdapter + event.query.$lastIndex.toString();
                        event.query.join(q.as(pqAlias)).with(QueryUtils.where(entity.select(model.primaryKey)).equal(new QueryEntity(pqAlias).select(model.primaryKey)));
                        return callback();
                    });
                }
                return callback();

            });
        });

    }
    else {
        callback();
    }
};

module.exports = {
    DataPermissionEventArgs,
    DataPermissionEventListener,
    DataPermissionExclusion,
    PermissionMask
};



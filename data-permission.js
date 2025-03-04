// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
var {QueryEntity} = require('@themost/query');
var {QueryUtils} = require('@themost/query');
var async = require('async');
var {AccessDeniedError, DataError} = require('@themost/common');
var {DataConfigurationStrategy} = require('./data-configuration');
var _ = require('lodash');
var { at } = require('lodash')
var {hasOwnProperty} = require('./has-own-property');
var {DataModelFilterParser} = require('./data-model-filter.parser');
var {DataQueryable} = require('./data-queryable');
var {SelectObjectQuery} = require('./select-object-query');
var { firstValueFrom } = require('rxjs');

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
     * @type {import('@themost/query').QueryExpression}
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
    var re = /([\x21\x23-\x2B\x2D-\x5B\x5D-\x7E]+)/g
    var results = [];
    var match = re.exec(str);
    while(match !== null) {
        results.push(match[0]);
        match = re.exec(str);
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
DataPermissionEventListener.prototype.beforeSave = function(event, callback)
{
    DataPermissionEventListener.prototype.validate(event, callback);
};
/**
 * Occurs before removing a data object.
 * @param {DataEventArgs} event - An object that represents the event arguments passed to this operation.
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
 * @returns {DataEventListener}
 */
DataPermissionEventListener.prototype.beforeRemove = function(event, callback)
{
    DataPermissionEventListener.prototype.validate(event, callback);
};
/**
 * Validates permissions against the event arguments provided.
 * @param {DataEventArgs|DataPermissionEventArgs} event - An object that represents the event arguments passed to this operation.
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
 */
DataPermissionEventListener.prototype.validate = function(event, callback) {
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
    context.user = context.user || { name:'anonymous',authenticationType:'None' };
    //description: Use unattended execution account as an escape permission check account
    var authSettings = context.getConfiguration().getStrategy(DataConfigurationStrategy).getAuthSettings();
    if (authSettings)
    {
        var unattendedExecutionAccount=authSettings.unattendedExecutionAccount;
        if ((typeof unattendedExecutionAccount !== 'undefined'
            || unattendedExecutionAccount != null)
            && (unattendedExecutionAccount===context.user.name))
        {
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
    effectiveAccounts(context, function(err, accounts) {
        if (err) { 
            return callback(err);
        }
        // clone privileges
        var clonedPrivileges = _.cloneDeep(model.privileges || []);
        var privileges = clonedPrivileges
            // exclude disabled privileges
            .filter(function(x) { 
                return !x.disabled && ((x.mask & requestMask) === requestMask) 
            })
            // exclude privileges with exclude expression
            .filter(function(x) { 
                var exclude = new DataPermissionExclusion(model).tryExclude(x);
                return !exclude;
            });
        if (privileges.length===0) {
            // the target model should have at least one privilege
            // so add default privilege for any mask
            // this operation is very important for security reasons
            privileges.push({
                type: 'global',
                mask: 31 // read, insert, update, delete and execute
            });
        }
        if (privileges.length===0) {
            if (event.throwError) {
                return callback(new AccessDeniedError());
            }
            else {
                // set result to false (access denied)
                event.result = false;
                //and exit
                return callback();
            }
        }
        else {
            var cancel = false;
            event.result = false;
            //enumerate privileges
            async.eachSeries(privileges, function(item, cb) {
                if (cancel) {
                    return cb();
                }
                // try to check if the privilege should be excluded
                var exclude = new DataPermissionExclusion(model).tryExclude(item);
                // if the privilege should be excluded
                if (exclude) {
                    // continue with next privilege
                    return cb();
                }
                //global
                if (item.type==='global') {
                    if (typeof item.account !== 'undefined') {
                        //check if a privilege is assigned by the model
                        if (item.account==='*') {
                            //get permission and exit
                            cancel=true;
                            event.result = true;
                            return cb();
                        }
                        else if (hasOwnProperty(item, 'account')) {
                            if (accounts.findIndex(function(x) { return x.name === item.account })>=0) {
                                cancel=true;
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
                        .and('account').in(accounts.map(function(x) { return x.id; }))
                        .and('mask').bit(requestMask, requestMask).silent().count(function(err, count) {
                            if (err) {
                                return cb(err);
                            }
                            else {
                                if (count>=1) {
                                    cancel=true;
                                    event.result = true;
                                }
                                return cb();
                            }
                        });
                }
                else if (item.type==='parent') {
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
                    if (requestMask===PermissionMask.Create) {
                        permissions.where('privilege').equal(privilege)
                            .and('parentPrivilege').equal(parentPrivilege)
                            .and('target').equal(event.target[mapping.childField])
                            .and('workspace').equal(workspace)
                            .and('account').in(accounts.map(function(x) { return x.id; }))
                            .and('mask').bit(requestMask, requestMask).silent().count(function(err, count) {
                                if (err) {
                                    return cb(err);
                                }
                                else {
                                    if (count>=1) {
                                        cancel=true;
                                        event.result = true;
                                    }
                                    return cb();
                                }
                            });
                    }
                    else {
                        //get original value
                        model.where(model.primaryKey).equal(event.target[model.primaryKey]).select(mapping.childField).first(function(err, result) {
                            if (err) {
                                cb(err);
                            }
                            else if (result) {
                                permissions.where('privilege').equal(privilege)
                                    .and('parentPrivilege').equal(parentPrivilege)
                                    .and('target').equal(result[mapping.childField])
                                    .and('workspace').equal(workspace)
                                    .and('account').in(accounts.map(function(x) { return x.id; }))
                                    .and('mask').bit(requestMask, requestMask).silent().count(function(err, count) {
                                        if (err) {
                                            return cb(err);
                                        }
                                        else {
                                            if (count>=1) {
                                                cancel=true;
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
                else if (item.type==='item') {
                    //if target object is a new object
                    if (requestMask===PermissionMask.Create) {
                        //do nothing
                        return cb();
                    }
                    permissions.where('privilege').equal(privilege)
                        .and('parentPrivilege').equal(null)
                        .and('target').equal(event.target[model.primaryKey])
                        .and('workspace').equal(workspace)
                        .and('account').in(accounts.map(function(x) { return x.id; }))
                        .and('mask').bit(requestMask, requestMask).silent().count(function(err, count) {
                            if (err) {
                                return cb(err);
                            }
                            else {
                                if (count>=1) {
                                    cancel=true;
                                    event.result = true;
                                }
                                return cb();
                            }
                        });
                }
                else if (item.type==='self') {
                    // #implementWhenExpression
                    // check if the specified privilege has account attribute
                    if (typeof item.account !== 'undefined' && item.account !== null && item.account !== '*') {
                        // if user does not have this account return
                        if (accounts.findIndex(function(x) { return x.name === item.account; }) < 0) {
                            return cb();
                        }
                    }
                    if (requestMask===PermissionMask.Create) {
                        var query = new SelectObjectQuery(model).select(event.target);
                        const filter = item.when || item.filter;
                        model.filter(filter, function(err, q) {
                            if (err) {
                                cb(err);
                            }
                            else {
                                // get filter params (where and join statements)
                                var {$where, $prepared, $expand} = q.query;
                                if ($where === null && $prepared === null) {
                                    return cb(new Error('Where condition cannot be empty while validating object privileges.'));
                                }
                                // and assign them to the fixed query produced by the previous step
                                Object.assign(query, {
                                    $where,
                                    $prepared,
                                    $expand
                                });
                                // execute query
                                model.context.db.execute(query,null, function(err, result) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    else {
                                        // if user has access
                                        if (result.length === 1) {
                                            // set cancel flag for exiting the loop
                                            cancel=true;
                                            // set result to true
                                            event.result = true;
                                        }
                                        return cb();
                                    }
                                });
                            }
                        });
                    }
                    else {
                        // get primary key
                        var { [model.primaryKey]: key } = event.target;
                        // get privilege filter
                        var parser = new DataModelFilterParser(model);
                        // stage 1: parse filter condition
                        // the "when" statement is a filter condition that should be evaluated before validating the current state of the object
                        var when = item.when || item.filter;
                        parser.parse(when, function(err, params) {
                            if (err) {
                                return cb(err);
                            }
                            var { $where, $expand } = params;
                            if ($where === null) {
                                return cb(new Error('Where condition cannot be empty while validating object privileges.'));
                            }
                            var q = new DataQueryable(model);
                            Object.assign(q.query, {
                                $where,
                                $expand
                            });
                            // stage 2: query for object and get original data
                            return q.prepare().where(model.primaryKey).equal(key).silent().flatten().getItems().then(
                                function(results) {
                                    // throw error if more than one result is returned
                                    if (results.length > 1) {
                                        return cb(new DataError('E_PRIMARY_KEY', 'Primary key violation', null, model.name, model.primaryKey));
                                    }
                                    if (results.length === 1) {
                                        // get result
                                        var [result] = results;
                                        // get target object ready for validation
                                        var selectTarget = new SelectObjectQuery(model).map(event.target);
                                        var target = requestMask === PermissionMask.Update ? Object.assign(result, selectTarget) : result;
                                        // get filter condition which is going to be evaluated against the target object
                                        var filter = item.filter || item.when;
                                        return parser.parse(filter, function(err, params) {
                                            if (err) {
                                                return cb(err);
                                            }
                                            var query = new SelectObjectQuery(model).select(target);
                                            // get filter params (where and join statements)
                                            var {$where, $expand} = params;
                                            // and assign them to the fixed query produced by the previous step
                                            // note: a fixed query is a query that contains constant values
                                            // and is being prepared for validating filter conditions defined by the current privilege
                                            Object.assign(query, {
                                                $where,
                                                $expand
                                            });
                                            // execute native query
                                            return model.context.db.execute(query,null, function(err, result) {
                                                if (err) {
                                                    return cb(err);
                                                }
                                                if (result.length === 1) {
                                                    // user has access
                                                    // set cancel flag for exiting the loop
                                                    cancel=true;
                                                    // set result to true
                                                    event.result = true;
                                                }
                                                return cb();
                                            });
                                        });
                                    }
                                    return cb();
                                }
                            ).catch(function(err) {
                                return cb(err);
                            });
                        });
                    }
                    // #implementWhenExpression
                }
                else {
                    //do nothing (unknown permission)
                    return cb();
                }

            }, function(err) {
                if (err) {
                    return callback(err);
                }
                else {
                    if (event.throwError && !event.result) {
                        var error = new AccessDeniedError();
                        error.model = model.name;
                        callback(error);
                    }
                    else {
                        return callback();
                    }
                }
            });
        }

    });
};
/**
 * @param {import('./types').DataContext} context
 * @param {function(Error=,Array=)} callback
 * @private
 */
function effectiveAccounts(context, callback) {
    var accounts = [ { id: null } ];
    if (context == null) {
        //push empty accounts
        return callback(null, accounts);
    }
    // validate context user
    context.user = context.user || { name:'anonymous',authenticationType:'None' };
    try {
        var source$ = context.user.name === 'anonymous' ? context.anonymousUser$ : context.user$;
        void firstValueFrom(source$).then(function(user) {
            if (user) {
                accounts = [
                    { id: user.id, name: user.name }
                ];
                if (Array.isArray(user.groups)) {
                    accounts.push.apply(accounts, user.groups.map(function(x) { return { id: x.id, name: x.name }; }));
                }
            }
            return callback(null, accounts);
        }).catch(function (err) {
            return callback(err);
        });
    } catch (err) {
        return callback(err);
    }
}

/**
 * Occurs before executing a data operation.
 * @param {DataEventArgs} event - An object that represents the event arguments passed to this operation.
 * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
 */
DataPermissionEventListener.prototype.beforeExecute = function(event, callback)
{
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
    if (model.privileges.filter(function(x) { return !x.disabled; }, model.privileges).length===0) {
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
                requestMask=1;
            else if (event.query.$insert)
            //create permissions
                requestMask=2;
            else if (event.query.$update)
            //update permissions
                requestMask=4;
            else if (event.query.$delete)
            //delete permissions
                requestMask=8;
        }
    }
    //ensure context user
    context.user = context.user || { name:'anonymous',authenticationType:'None' };
    //change: 2-May 2015
    //description: Use unattended execution account as an escape permission check account
    var authSettings = context.getConfiguration().getStrategy(DataConfigurationStrategy).getAuthSettings();
    if (authSettings)
    {
        var unattendedExecutionAccount=authSettings.unattendedExecutionAccount;
        if ((typeof unattendedExecutionAccount !== 'undefined'
            || unattendedExecutionAccount !== null)
            && (unattendedExecutionAccount===context.user.name))
        {
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
        if (modelPrivileges.length == 0) {
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
        if (modelPrivileges.length===0) {
            //do nothing and exit
            return callback();
        }
        //tuning up operation
        //validate request mask permissions against all users privilege { mask:<requestMask>,disabled:false,account:"*" }
        var allUsersPrivilege = modelPrivileges.find(function(x) {
            return (((x.mask & requestMask)===requestMask) && !x.disabled && (x.account==='*'));
        });
        if (typeof allUsersPrivilege !== 'undefined') {
            //do nothing
            return callback();
        }

        effectiveAccounts(context, function(err, accounts) {
            if (err) { callback(err); return; }
            //get all enabled privileges
            var privileges = modelPrivileges.filter(function(x) {
                return !x.disabled && ((x.mask & requestMask) === requestMask);
            });

            // set query lastIndex
            event.query.$lastIndex = parseInt(event.query.$lastIndex) || 0;
            var cancel = false, assigned = false, entity = new QueryEntity(model.viewAdapter), expand = null,
                perms1 = new QueryEntity(permissions.viewAdapter).as(permissions.viewAdapter + event.query.$lastIndex.toString()), expr = null;
            async.eachSeries(privileges, function(item, cb) {
                if (cancel) {
                    return cb();
                }
                try {
                    // try to check if the privilege should be excluded
                    var exclude = new DataPermissionExclusion(model).tryExclude(item);
                    // if the privilege should be excluded
                    if (exclude) {
                        // continue with next privilege
                        return cb();
                    }
                    if (item.type==='global') {
                        //check if a privilege is assigned by the model
                        if (item.account==='*') {
                            //get permission and exit
                            assigned=true;
                            return cb(new EachSeriesCancelled());
                        }
                        else if (hasOwnProperty(item, 'account')) {
                            if (accounts.findIndex(function(x) { return x.name === item.account })>=0) {
                                assigned=true;
                                return cb(new EachSeriesCancelled());
                            }
                        }
                        //try to find user has global permissions assigned
                        permissions.where('privilege').equal(privilege).
                            and('parentPrivilege').equal(parentPrivilege).
                            and('target').equal('0').
                            and('workspace').equal(1).
                            and('account').in(accounts.map(function(x) { return x.id; })).
                            and('mask').bit(requestMask, requestMask).silent().count(function(err, count) {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    if (count>=1) {
                                        assigned=true;
                                        return cb(new EachSeriesCancelled());
                                    }
                                    cb();
                                }
                            });
                    }
                    else if (item.type==='parent') {
                        // #implementWhenExpression
                        // is this privilege assignable to the current user -and its groups-?
                        if (typeof item.account !== 'undefined' && item.account !== null && item.account !== '*') {
                            if (accounts.findIndex(function(x) { return x.name === item.account; }) < 0) {
                                return cb();
                            }
                        }
                        // try to get mapping from "property" which should be an attribute of the current model
                        var mapping = model.inferMapping(item.property);
                        if (mapping == null) {
                            // if mapping is not found, throw error
                            return cb(new DataError('Invalid configuration. A parent privilege should refer to an attribute which defines an association.', null, model.name, item.property));
                        }
                        if (expr == null) {
                            expr = QueryUtils.query();
                        }
                        //
                        if (mapping.childModel !== model.name) {
                            return cb(new DataError('Invalid configuration. A parent privilege mapping should refer to a foreign key association on the current model.', null, model.name, item.property));
                        }
                        /**
                         * @type {number[]}
                         */
                        var values = accounts.map(function(x) { return x.id; });
                        expr.where(entity.select(mapping.childField)).equal(perms1.select('target'))
                            .and(perms1.select('privilege')).equal(mapping.childModel)
                            .and(perms1.select('parentPrivilege')).equal(item.property)
                            .and(perms1.select('workspace')).equal(workspace)
                            .and(perms1.select('mask')).bit(requestMask,requestMask)
                            .and(perms1.select('account')).in(values).prepare(true);
                        assigned=true;
                        return cb();
                        // #implementWhenExpression
                    }
                    else if (item.type==='item') {
                        if (_.isNil(expr))
                            expr = QueryUtils.query();
                        expr.where(entity.select(model.primaryKey)).equal(perms1.select('target')).
                            and(perms1.select('privilege')).equal(model.name).
                            and(perms1.select('parentPrivilege')).equal(null).
                            and(perms1.select('workspace')).equal(workspace).
                            and(perms1.select('mask')).bit(requestMask, requestMask).
                            and(perms1.select('account')).in(accounts.map(function(x) { return x.id; })).prepare(true);
                        assigned=true;
                        cb();
                    }
                    else if (item.type==='self') {
                        // check if the specified privilege has account attribute
                        if (typeof item.account !== 'undefined' && item.account !== null && item.account !== '*') {
                            // if user does not have this account return
                            if (accounts.findIndex(function(x) { return x.name === item.account; }) < 0) {
                                return cb();
                            }
                        }
                        if (typeof item.filter === 'string' ) {
                            model.filter(item.filter, function(err, q) {
                                if (err) {
                                    cb(err);
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
                                        assigned=true;
                                        cb();
                                    }
                                    else
                                        cb();
                                }
                            });
                        }
                        else {
                            cb();
                        }
                    }
                    else {
                        cb();
                    }
                }
                catch (e) {
                    cb(e);
                }
            }, function(err) {
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
                    return context.model('Permission').migrate(function(err) {
                        if (err) { return callback(err); }
                        var q = QueryUtils.query(model.viewAdapter).select([model.primaryKey]).distinct();
                        if (expand) {
                            var arrExpand=[].concat(expand);
                            _.forEach(arrExpand, function(x){
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
    PermissionMask,
    DataPermissionExclusion
};



const { Args, Guid, DataError } = require('@themost/common');
const moment = require('moment');
const { v4 } = require('uuid');
const {isObjectDeep} = require('./is-object');
const random = require('lodash/random');
const getProperty = require('lodash/get');
const esprima = require('esprima');
require('@themost/promise-sequence');
const { AsyncSeriesEventEmitter } = require('@themost/events');
const { round } = require('@themost/query');
const MD5 = require('crypto-js/md5');
const { DataAttributeResolver } = require('./data-attribute-resolver');

const testFieldRegex = /^\$\w+(\.\w+)*$/g;

/**
 * @param {ValueFormatter} formatter 
 * @param {import('./data-model').DataModel} model
 * @param {import('./data-queryable').DataQueryable} emitter
 * @returns 
 */
function getValueReplacer(formatter, model, emitter) {
  return function(key, value) {
    if (typeof value === 'string') {
        if (/^\$\$/.test(value)) {
          return formatter.formatVariableSync(value);
        }
        if (testFieldRegex.test(value)) {
            const name = value.replace(/^\$/, '');
            const parts = name.split('.');
            if (parts.length === 1) {
              const { viewAdapter: collection } = model;
              const field = model.getAttribute(name);
              if (field) {
                  return {
                    $name: collection + '.' + name
                  }
              }
              throw new DataError('An expression contains an attribute that cannot be found', null, model.name, name);
            } else {
              const result = new DataAttributeResolver().resolveNestedAttribute.bind(emitter)(name.replace(/\./g, '/'));
              if (result) {
                return result;
              }
              throw new DataError('An nested expression contains an attribute that cannot be found', null, model.name, name);
            }
          }
    }
    return value;
  }
}


function getFunctionArguments(fn) {
  if (typeof fn !== 'function') {
    throw new Error('Invalid parameter. Expected function.');
  }
  // if dialect function params are already cached
  if (Object.prototype.hasOwnProperty.call(fn, 'dialectFunctionParams')) {
    // return cached function params
    return fn.dialectFunctionParams;
  }
  const fnString = fn.toString().trim();
  let ast;
  if (/^function\s+/i.test(fnString) === false) {
    if (/^async\s+/i.test(fnString)) {
      ast = esprima.parseScript(fnString.replace(/^async\s+/, 'async function '));
    } else {
      ast = esprima.parseScript('function ' + fnString);
    }
  } else {
    ast = esprima.parseScript(fnString);
  }
  const params = ast.body[0].params.map((param) => param.name);
  // cache function params
  Object.defineProperty(fn, 'dialectFunctionParams', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: params
  });
  return params;
} 

class ValueDialect {
  /**
   * @param {import('./types').DataContext} context 
   * @param {*} target
   */
  constructor(context, model, target) {
    this.context = context;
    this.model = model;
    this.target = target;
  }

  /**
   * Get the current date and time
   * @returns {Promise<Date>}
   */
  async $date() {
    return new Date();
  }

  /**
   * Add the specified amount of time to the specified date
   * @returns {Promise<Date>}
   */
  async $dateAdd(startDate, unit, amount) {
    return moment(startDate).add(amount, unit).toDate();
  }

  /**
   * Add the specified amount of time to the specified date
   * @returns {Promise<Date>}
   */
  async $dateSubtract(startDate, unit, amount) {
    return moment(startDate).subtract(amount, unit).toDate();
  }

  /**
   * A shorthand for $date method
   * @returns {Promise<Date>}
   */
  async $now() {
    return new Date();
  }

  /**
   * Get the current date
   * @returns {Promise<Date>}
   */
  async $today() {
    return moment(new Date()).startOf('day').toDate();
  }

  async $year(date) {
    return moment(date).year();
  }

  async $month(date) {
    return moment(date).month();
  }

  async $dayOfMonth(date) {
    return moment(date).date();
  }

  async $dayOfWeek(date) {
    return moment(date).day();
  }

  async $hour(date) {
    return moment(date).hour();
  }

  async $minutes(date) {
    return moment(date).minutes();
  }

  async $seconds(date) {
    return moment(date).seconds();
  }

  /**
   * Get current user identifier or the value of the specified attribute
   * @param {string=} property 
   * @returns Promise<any>
   */
  $user(property) {
    const selectAttribute = property || 'id';
    let name = this.context.user && this.context.user.name;
    if (Object.prototype.hasOwnProperty.call(this.context, 'interactiveUser') === true) {
      name = this.context.interactiveUser && this.context.interactiveUser.name;
    }
    return this.context.model('User').asQueryable().where((x, username) => {
      return x.name === username && x.name != null && x.name != 'anonymous';
    }, name).select(selectAttribute).value().then((result) => {
      if (typeof result === 'undefined') {
        return null;
      }
      return result;
    });
  }
  /**
   * A shorthand for $user method
   * @param {string=} property 
   * @returns Promise<any>
   */
  $me(property) {
    return this.$user(property);
  }

  /**
   * Get a new GUID value
   * @returns {Promise<string>}
   */
  $newGuid() {
    return Promise.resolve(v4().toString());
  }

  /**
   * Get a new GUID value
   * @returns {Promise<string>}
   */
    $uuid() {
      return Promise.resolve(v4().toString());
    }

  /**
   * Get a new identifier value for the current data model
   * @returns {Promise<any>}
   */
  $newid() {
    return new Promise((resolve, reject) => {
        this.model.context.db.selectIdentity(this.model.sourceAdapter, this.model.primaryKey, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
  }

  /**
   * @param {...*} args
   */
  $concat() {
    return Promise.resolve(Array.from(arguments).join(''));
  }

  /**
   * @param {*} value
   */
  $toLowerCase(value) {
    return Promise.resolve(value == null ? null : String(value).toLowerCase());
  }

  $toLower(value) {
    return this.$toLowerCase(value);
  }

  /**
   * @param {*} value
   */
  $toUpperCase(value) {
    return Promise.resolve(value == null ? null : String(value).toUpperCase());
  }

  $toUpper(value) {
    return this.$toUpperCase(value);
  }

  $length(value) {
    return value == null ? 0 : value.length;
  }

  $substring(value, start, length) {
    return value == null ? null : value.substring(start, length);
  }

  /**
   * Returns a random string with the specified length
   * @param {number=} length 
   * @returns 
   */
  $randomString(length) {
    return new Promise((resolve, reject) => {
        try {
            length = length || 8;
            var chars = 'abcdefghkmnopqursuvwxz2456789ABCDEFHJKLMNPQURSTUVWXYZ';
            var str = '';
            var rnd;
            for(var i = 0; i < length; i++) {
                rnd = random(0, chars.length - 1);
                str += chars.substring(rnd, rnd + 1);
            }
            resolve(str);
        }
        catch (err) {
            reject(err);
        }
    });
  }

  /**
   * A shorthand for $randomString method
   * @param {number=} length
   * @returns {Promise<string>}
   */
  $chars(length) {
    return this.$randomString(length);
  }

  /**
   * Returns a random integer value
   * @param {number=} min 
   * @param {number=} max 
   * @returns 
   */
  $randomInt(min, max) {
    return new Promise((resolve, reject) =>{
        try {
            resolve(random(min, max));
        }
        catch (err) {
            reject(err);
        }
    });
  }

  /**
   * 
   * @param {*} min 
   * @param {*} max 
   * @returns 
   */
  $int(min, max) {
    return this.$randomInt(min, max);
  }

  $abs(value) {
    return value != null ? Math.abs(value) : null;
  }

  /**
   * Returns a random string containing only numbers with the specified length
   * @param {number=} length 
   * @returns 
   */
  $randomNumbers(length) {
    return new Promise((resolve, reject) => {
        try {
            length = length || 8;
            var chars = '0123456789';
            var str = '';
            var rnd;
            for(var i = 0; i < length; i++) {
                rnd = random(0, chars.length - 1);
                str += chars.substring(rnd, rnd + 1);
            }
            resolve(str);
        }
        catch (err) {
            reject(err);
        }
    });
  }

  /**
   * A shorthand for $randomNumbers method
   * @param {number=} length 
   * @returns 
   */
  $numbers(length) {
    return this.$randomNumbers(length);
  }

  /**
   * Returns a random password with the specified length
   * @param {number} length 
   */
  $randomPassword(length) {
    return new Promise((resolve, reject) => {
        try {
            length = length || 16;
            const chars = 'abcdefghkmnopqursuvwxz2456789ABCDEFHJKLMNPQURTUVWXYZ';
            const numberChars = '0123456789';
            let requiredNumberChars = length < 8 ? 1 : 2;
            const specialChars = '!@#$%^&*()_+';
            let requiredSpecialChars = length < 8 ? 1 : 2;
            let str = '';
            let rnd;
            for(var i = 0; i < length; i++) {
              if (requiredNumberChars > 0 && random(0, 1) === 1) {
                rnd = random(0, numberChars.length - 1);
                str += numberChars.substring(rnd, rnd + 1);
                requiredNumberChars--;
                continue;
              }
              if (requiredSpecialChars > 0 && random(0, 1) === 1) {
                rnd = random(0, specialChars.length - 1);
                str += specialChars.substring(rnd, rnd + 1);
                requiredSpecialChars--;
                continue;
              }
              rnd = random(0, chars.length - 1);
              str += chars.substring(rnd, rnd + 1);
            }
            resolve(str);
        }
        catch (err) {
            reject(err);
        }
    });
  }

  /**
   * A shorthand for $randomPassword method
   * @param {number=} length 
   * @returns 
   */
  $password(length) {
    return this.$randomPassword(length);
  }

  /**
   * Rounds the specified value to the nearest integer
   * @param {*} value The value to round
   * @param {*} place The number of decimal places to round
   * @returns 
   */
  async $round(value, place) {
    return round(value, place);
  }

  /**
   * Converts the specified value to a number and returns the absolute value
   * @param {*} value 
   * @returns 
   */
  async $ceil(value) {
    return Math.ceil(value);
  }

  /**
   * Converts the specified value to a number and returns the lowest integer value
   * @param {*} value 
   * @returns 
   */
  async $floor(value) {
    return Math.floor(value);
  }

  async $add() {
    return Array.from(arguments).reduce((a, b) => a + b, 0);
  }

  async $subtract() {
    return Array.from(arguments).reduce((a, b) => a - b, 0);
  }

  async $multiply() {
    return Array.from(arguments).reduce((a, b) => a * b, 1);
  }

  async $divide() {
    return Array.from(arguments).reduce((a, b) => a / b, 1);
  }

  async $mod() {
    return Array.from(arguments).reduce((a, b) => a % b, 0);
  } 

  async $toString(value) {
    if (value == null) {
      return null;
    } 
    return String(value).toString();
  }

  async $trim(value) {
    if (value == null) {
      return null;
    } 
    return String(value).trim();
  }

  async $toInt(value) {
    return parseInt(value, 10);
  }

  async $toDouble(value) {
    if (typeof value === 'number') {
      return Promise.resolve(value);
    }
    return parseFloat(value);
  }

  async $toDecimal(value) {
    if (typeof value === 'number') {
      return Promise.resolve(value);
    }
    return parseFloat(value);
  }

  /**
   * Converts the specified value to a UUID
   * @param {*} value 
   * @returns 
   */
  async $toGuid(value) {
    if (Guid.isGuid(value)) {
      return Promise.resolve(value);
    }
    var str = MD5(value).toString();
    return new Guid([
      str.substring(0, 8),
      str.substring(8, 12),
      str.substring(12, 16),
      str.substring(16, 20),
      str.substring(20, 32)
    ].join('-'));
  }

  /**
   * A shorthand for $toGuid method
   * @param {*} value 
   * @returns 
   */
  async $toUUID(value) {
    return this.$toGuid(value);
  }

  async $eq() {
    const [a,b] = Array.from(arguments);
    return a === b;
  }

  async $gt() {
    const [a,b] = Array.from(arguments);
    return a > b;
  }

  async $lt() {
    const [a,b] = Array.from(arguments);
    return a < b;
  } 

  async $gte() {
    const [a,b] = Array.from(arguments);
    return a >= b;
  }

  async $lte() {
    const [a,b] = Array.from(arguments);
    return a <= b;
  }

  async $ne() {
    const [a,b] = Array.from(arguments);
    return a !== b;
  }

  async $or() {
    return Array.from(arguments).reduce((a, b) => a || b, false);
  }

  async $and() {
    return Array.from(arguments).reduce((a, b) => a && b, true);
  }

  async $cond(ifExpr, thenExpr, elseExpr) {
    return ifExpr ? thenExpr : elseExpr;
  }

  async $replaceOne(input, find, replacement) {
    if (input == null) {
      return null;
    }
    return input.replace(find, replacement);
  }

  /**
   * @param {string} input 
   * @param {string} find
   * @param {string} replacement
   */
  async $replaceAll(input, find, replacement) {
    if (input == null) {
      return null;
    }
    return input.replaceAll(new RegExp(find, 'g'), replacement);
  }

}

class ValueFormatter {

  /**
   * 
   * @param {import('./types').DataContext} context 
   * @param {import('@themost/common').DataModelBase=} model 
   * @param {*=} target
   */
  constructor(context, model, target) {
    this.context = context;
    this.model = model;
    this.target = target;
    this.dialect = new ValueDialect(context, model, target);
    this.resolvingVariable = new AsyncSeriesEventEmitter();
  }

  /**
   * @param {string} value
   * @returns Promise<any>
   */
  async formatVariable(value) {
    const propertyPath = value.substring(2).split('.');
    const property = propertyPath.shift();
    if (Object.prototype.hasOwnProperty.call(this.dialect, property)) {
      return getProperty(this.dialect[property], propertyPath.join('.'));
    } else {
      const event = {
        name: value,
        model: this.model,
        context: this.context,
        target: this.target
      }
      await this.resolvingVariable.emit('resolve', event);
      if (Object.prototype.hasOwnProperty.call(event, 'value')) {
        return event.value;
      }
      throw new Error(`Variable '${property}' not found.`);
    }
  }

  formatVariableSync(value) {
    const propertyPath = value.substring(2).split('.');
    const property = propertyPath.shift();
    if (Object.prototype.hasOwnProperty.call(this.dialect, property)) {
      return getProperty(this.dialect[property], propertyPath.join('.'));
    } else {
      throw new Error(`Variable '${property}' not found.`);
    }
  }

  /**
   * 
   * @param {{$collection: string, $select: { value: string }, $where: *, $sort: *=, $order: Array<*>=, $group: Array<*>=}} query 
   */
  async formatQuery(query) {
    const model = this.context.model(query.$collection);
    const q = model.asQueryable();
    if (Object.prototype.hasOwnProperty.call(query, '$select') === false) {
      throw new Error('Query expression $select statement not found.');
    }
    if (Object.prototype.hasOwnProperty.call(query.$select, 'value') === false) {
      throw new Error('Query expression $select statement should a value property.');
    }
    // use select expression
    // get value property
    const { value: attribute } = query.$select;
    // parse select expression
    q.select(attribute.replace(/^\$/, '').replace(/^\./, '/'));
    if (Object.prototype.hasOwnProperty.call(query, '$where') === false) {
      throw new Error('Query expression $where statement not found.');
    }
    /**
     * @returns {function(string, *)}
     */
    const nameReplacer = getValueReplacer(this, model, q);
    const $where = JSON.parse(JSON.stringify(query.$where, function(key, value) {
      return nameReplacer(key, value);
    }));
    Object.assign(q.query, {
      $where
    });
    if (Array.isArray(query.$order)) {
      const $order = JSON.parse(JSON.stringify(query.$order, function(key, value) {
        return nameReplacer(key, value);
      }));
      Object.assign(q.query, {
        $order
      });
    }
    if (Array.isArray(query.$group)) {
      const $group = JSON.parse(JSON.stringify(query.$group, function(key, value) {
        return nameReplacer(key, value);
      }));
      Object.assign(q.query, {
        $group
      });
    }
    return q.value();
  }

  /**
   * @param {*} value 
   * @returns Promise<any>
   */
  format(value) {
    if (isObjectDeep(value) === false) {
      if (typeof value === 'string' && value.startsWith('$$')) {
        return this.formatVariable(value);
      }
      return Promise.resolve(value);
    }
    // get property
    const [property] = Object.keys(value);
    // check if method is $value e.g. $value: 'Hello World'
    if (property === '$value') {
      const val = value[property];
      if (typeof val === 'string' && val.startsWith('$$')) {
        return this.formatVariable(val);
      }
      return Promise.resolve(value);
    }
    if (property.startsWith('$$')) {
      return this.formatVariable(value);
    }
    // exception $cond method which is a special case of formatting method
    if (property === '$cond') {
      // use language keywords if, then, else
      const cond = value[property];
      if (Object.prototype.hasOwnProperty.call(cond, 'if') && Object.prototype.hasOwnProperty.call(cond, 'then') && Object.prototype.hasOwnProperty.call(cond, 'else')) {
        return Promise.all([
          this.format(cond.if),
          this.format(cond.then),
          this.format(cond.else)
        ]).then(([ifExpr, thenExpr, elseExpr]) => {
          return this.dialect.$cond(ifExpr, thenExpr, elseExpr);
        });
      }
    }

    if (property === '$query') {
      return this.formatQuery(value[property]);
    }

    // check if method exists
    const propertyDescriptor  = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this.dialect), property);
    if (propertyDescriptor) {
      Args.check(propertyDescriptor.value instanceof Function, 'Dialect method must be a function.');
      // get arguments
      const args = value[property];
      if (args == null) {
        return Promise.resolve(null);
      }
      if (Array.isArray(args)) {
        return Promise.sequence(args.map((arg) => {
          return () => this.format(arg);
        })).then((args) => {
          // call dialect method
          const invoke = propertyDescriptor.value;
          return invoke.apply(this.dialect, args);
        });
      } else {
        const params = getFunctionArguments(propertyDescriptor.value);
        return Promise.sequence(params.map((param) => {
          if (Object.prototype.hasOwnProperty.call(args, param)) {
            return args[param];
          } 
          return null;
        }).map((arg) => {
          return () => this.format(arg);
        })).then((args) => {
          // call dialect method
          const invoke = propertyDescriptor.value;
          return invoke.apply(this.dialect, args);
        });
      }
      
    } else {
      Promise.reject(new Error(`Dialect method '${property}' not found.`));
    }
  }

  /**
   * @param {*} name 
   * @param {*} definition 
   */
  static register(name, definition) {
    Object.assign(ValueDialect.prototype, definition)
  }

}
//** @ts-ignore **/
module.exports = {
  ValueDialect,
  ValueFormatter
};
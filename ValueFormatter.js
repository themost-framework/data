const { Args } = require('@themost/common');
const moment = require('moment');
const { v4 } = require('uuid');
const {isObjectDeep} = require('./is-object');
const random = require('lodash/random');
const esprima = require('esprima');

require('@themost/promise-sequence');

function getFunctionArguments(fn) {
  if (typeof fn !== 'function') {
    throw new Error('Invalid parameter. Expected function.');
  }
  const fnString = fn.toString().trim();
  let ast;
  if (/^function\s+/i.test(fnString) === false) {
    ast = esprima.parseScript('function ' + fnString);
  } else {
    ast = esprima.parseScript(fnString);
  }
  return ast.body[0].params.map((param) => param.name);
} 

class ValueDialect {
  /**
   * @param {import('./types').DataContext} context 
   */
  constructor(context) {
    this.context = context;
  }

  /**
   * Get the current date and time
   * @returns {Promise<Date>}
   */
  $date() {
    return Promise.resolve(new Date());
  }

  /**
   * A shorthand for $date method
   * @returns {Promise<Date>}
   */
  $now() {
    return Promise.resolve(new Date());
  }

  /**
   * Get the current date
   * @returns {Promise<Date>}
   */
  $today() {
    return Promise.resolve(moment(new Date()).startOf('day').toDate()); // new Date();
  }

  /**
   * Get current user identifier or the value of the specified attribute
   * @param {string=} property 
   * @returns Promise<any>
   */
  $user(property) {
    const selectAttribute = property || 'id';
    const name = this.context.user && this.context.user.name;
    return this.context.model('User').asQueryable().where((x, username) => {
      return x.name === username;
    }, name).select(selectAttribute).value();
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

}

class ValueFormatter {

  /**
   * 
   * @param {import('./types').DataContext} context 
   * @param {import('./types').DataMo} model 
   * @param {*} target
   */
  constructor(context, model, target) {
    this.context = context;
    this.model = model;
    this.target = target;
    this.dialect = new ValueDialect();
  }

  /**
   * @param {*} value 
   * @returns Promise<any>
   */
  format(value) {
    if (isObjectDeep(value) === false) {
      return Promise.resolve(value);
    }
    // get property
    const [property] = Object.keys(value);
    // check if method is $value e.g. $value: 'Hello World'
    if (property === '$value') {
      return Promise.resolve(value[property]);
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
}
//** @ts-ignore **/
module.exports = {
  ValueDialect,
  ValueFormatter
};
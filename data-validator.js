// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
/*eslint no-var: "off"*/
// noinspection ES6ConvertVarToLetConst

var _ = require('lodash');
var {sprintf} = require('sprintf-js');
var {LangUtils} = require('@themost/common');
var {DataConfigurationStrategy} = require('./data-configuration');
var {hasOwnProperty} = require('./has-own-property');

    /**
     * @class
     * @property {*} target - Gets or sets the target data object
     * @constructor
     */
    function DataValidator() {
        var context_;
        /**
         * Sets the current data context.
         * @param {DataContext|*} context
         */
        this.setContext = function(context) {
            context_ = context;
        };
        /**
         * Gets the current data context, if any.
         * @returns {DataContext|*}
         */
        this.getContext = function() {
            return context_;
        };
    }

    function zeroPad_(number, length) {
        number = number || 0;
        var res = number.toString();
        while (res.length < length) {
            res = '0' + res;
        }
        return res;
    }

    /**
     * @class
     * @param {string} pattern - A string which represents a regular expression
     * @property {string} message - Gets or sets a string which represents a custom validator message.
     * @constructor
     * @augments DataValidator
     * @classdesc Validates a variable against the regular expression provided
     */
    function PatternValidator(pattern) {
        this.pattern = pattern;
        PatternValidator.super_.call(this);
    }
    LangUtils.inherits(PatternValidator, DataValidator);
    PatternValidator.DefaultMessage = 'The value seems to be invalid.';
    /**
     * Validates the given value and returns a validation result or undefined if the specified value is invalid
     * @param val
     * @returns {{code: string, message: string, innerMessage: *}|undefined|null}
     */
    PatternValidator.prototype.validateSync = function(val) {
        if (val == null) {
            return null;
        }
        var valueTo = val;
        if (val instanceof Date) {
            var year   = val.getFullYear();
            var month  = zeroPad_(val.getMonth() + 1, 2);
            var day    = zeroPad_(val.getDate(), 2);
            var hour   = zeroPad_(val.getHours(), 2);
            var minute = zeroPad_(val.getMinutes(), 2);
            var second = zeroPad_(val.getSeconds(), 2);
            var millisecond = zeroPad_(val.getMilliseconds(), 3);
            //format timezone
            var offset = (new Date()).getTimezoneOffset(),
                timezone = (offset>=0 ? '+' : '') + zeroPad_(Math.floor(offset/60),2) + ':' + zeroPad_(offset%60,2);
            valueTo = year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second + '.' + millisecond + timezone;
        }
        var re = new RegExp(this.pattern, 'ig');
        if  (!re.test(valueTo)) {

            var innerMessage = null, message = this.message || PatternValidator.DefaultMessage;
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = this.getContext().translate(this.message || PatternValidator.DefaultMessage);
            }

            return {
                code:'EPATTERN',
                'message':message,
                'innerMessage':innerMessage
            }
        }
    };

    /**
     * @class
     * @param {number} length - A number which represents the minimum length
     * @property {number} minLength - Gets or sets an integer which represents the minimum length.
     * @property {string} message - Gets or sets a string which represents a custom validator message.
     * @augments {DataValidator}
     * @constructor
     * @classdesc Validates a variable which has a length property (e.g. a string) against the minimum length provided
     */
    function MinLengthValidator(length) {
        this.minLength = length;
        MinLengthValidator.super_.call(this);
    }

    LangUtils.inherits(MinLengthValidator,DataValidator);

    MinLengthValidator.DefaultMessage = 'The value is too short. It should have %s characters or more.';

    /**
     * Validates the given value. If validation fails, the operation will return a validation result.
     * @param {*} val
     * @returns {{code: string, minLength: number, message:string, innerMessage: string}|undefined|null}
     */
    MinLengthValidator.prototype.validateSync = function(val) {
        if (val == null) {
            return null;
        }
        if (hasOwnProperty(val, 'length')) {
            if (val.length<this.minLength) {

                var innerMessage = null, message = sprintf(this.message || MinLengthValidator.DefaultMessage, this.minLength);
                if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                    innerMessage = message;
                    message = sprintf(this.getContext().translate(this.message || MinLengthValidator.DefaultMessage), this.minLength);
                }

                return {
                    code:'EMINLEN',
                    minLength:this.minLength,
                    message:message,
                    innerMessage:innerMessage
                }

            }
        }
    };

    /**
     * @class
     * @param {number} length - A number which represents the maximum length
     * @augments {DataValidator}
     * @property {number} maxLength - Gets or sets an integer which represents the maximum length.
     * @property {string} message - Gets or sets a string which represents a custom validator message.
     * @constructor
     * @classdesc Validates a variable which has a length property (e.g. a string) against the maximum length provided
     */
    function MaxLengthValidator(length) {
        this.maxLength = length;
        MaxLengthValidator.super_.call(this);
    }
    LangUtils.inherits(MaxLengthValidator, DataValidator);

    MaxLengthValidator.DefaultMessage = 'The value is too long. It should have %s characters or fewer.';

    /**
     * Validates the given value. If validation fails, the operation will return a validation result.
     * @param {*} val
     * @returns {{code: string, maxLength: number, message:string, innerMessage: string}|undefined|*}
     */
    MaxLengthValidator.prototype.validateSync = function(val) {
        if (_.isNil(val)) {
            return;
        }

        var innerMessage = null, message = sprintf(this.message || MaxLengthValidator.DefaultMessage, this.maxLength);
        if (this.getContext() && (typeof this.getContext().translate === 'function')) {
            innerMessage = message;
            message = sprintf(this.getContext().translate(this.message || MaxLengthValidator.DefaultMessage), this.maxLength);
        }

        if (hasOwnProperty(val, 'length')) {
            if (val.length>this.maxLength) {
                return {
                    code:'EMAXLEN',
                    maxLength:this.maxLength,
                    message: message,
                    innerMessage:innerMessage
                }
            }
        }
    };

    /**
     * @class
     * @param {number|Date|*} min - A value which represents the minimum value
     * @augments {DataValidator}
     * @property {*} minValue - Gets or sets a value which represents the minimum value.
     * @property {string} message - Gets or sets a string which represents a custom validator message.
     * @constructor
     * @classdesc Validates a value against the minimum value provided
     */
    function MinValueValidator(min) {
        this.minValue = min;
        MinValueValidator.super_.call(this);
    }

    LangUtils.inherits(MinValueValidator, DataValidator);

    MinValueValidator.DefaultMessage = 'The value should be greater than or equal to %s.';
    /**
     * Validates the given value. If validation fails, the operation will return a validation result.
     * @param {*} val
     * @returns {{code: string, maxLength: number, message:string, innerMessage: string}|undefined|*}
     */
    MinValueValidator.prototype.validateSync = function(val) {
        if (val == null) {
            return null;
        }
        var minValue = this.minValue;
        if (val instanceof Date) {
            minValue = new Date(this.minValue);
        }
        if (val < minValue) {

            var innerMessage = null, message = sprintf(this.message || MinValueValidator.DefaultMessage, this.minValue);
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = sprintf(this.getContext().translate(this.message || MinValueValidator.DefaultMessage), this.minValue);
            }

            return {
                code:'EMINVAL',
                minValue:this.minValue,
                message:message,
                innerMessage:innerMessage
            }
        }
    };
    /**
     * @class
     * @param {number|Date|*} max - A value which represents the maximum value
     * @augments {DataValidator}
     * @property {*} maxValue - Gets or sets a value which represents the maximum value.
     * @property {string} message - Gets or sets a string which represents a custom validator message.
     * @constructor
     * @classdesc Validates a value against the maximum value provided
     */
    function MaxValueValidator(max) {
        this.maxValue = max;
        MaxValueValidator.super_.call(this);
    }

    LangUtils.inherits(MaxValueValidator, DataValidator);


    MaxValueValidator.DefaultMessage = 'The value should be lower or equal to %s.';
    /**
     * Validates the given value. If validation fails, the operation will return a validation result.
     * @param {*} val
     * @returns {{code: string, maxLength: number, message:string, innerMessage: string}|undefined|null}
     */
    MaxValueValidator.prototype.validateSync = function(val) {
        if (val == null) {
            return null;
        }
        var maxValue = this.maxValue;
        if (val instanceof Date) {
            maxValue = new Date(this.maxValue);
        }
        if (val > maxValue) {

            var innerMessage = null, message = sprintf(this.message || MaxValueValidator.DefaultMessage , this.maxValue);
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = sprintf(this.getContext().translate(this.message || MaxValueValidator.DefaultMessage), this.maxValue);
            }

            return {
                code:'EMAXVAL',
                maxValue:this.maxValue,
                message:message,
                innerMessage:innerMessage
            }
        }
    };
    /**
     * @class
     * @param {number|Date|*} min - A value which represents the minimum value
     * @param {number|Date|*} max - A value which represents the maximum value
     * @augments {DataValidator}
     * @property {*} minValue - Gets or sets a value which represents the minimum value
     * @property {*} maxValue - Gets or sets a value which represents the maximum value
     * @property {string} message - Gets or sets a string which represents a custom validator message.
     * @constructor
     * @classdesc Validates a value against a minimum and maximum value
     */
    function RangeValidator(min,max) {
        this.minValue = min;
        this.maxValue = max;
        RangeValidator.super_.call(this);
    }

    LangUtils.inherits(RangeValidator, DataValidator);

    RangeValidator.DefaultMessage = 'The value should be between %s to %s.';
    /**
     * Validates the given value. If validation fails, the operation will return a validation result.
     * @param {*} val
     * @returns {{code: string, maxLength: number, message:string, innerMessage: string}|undefined|*}
     */
    RangeValidator.prototype.validateSync = function(val) {
        if (val == null) {
            return null;
        }
        var minValidator, maxValidator, minValidation, maxValidation;
        if (!_.isNil(this.minValue)) {
            minValidator = new MinValueValidator(this.minValue);
            minValidation = minValidator.validateSync(val);
        }
        if (!_.isNil(this.maxValue)) {
            maxValidator = new MaxValueValidator(this.maxValue);
            maxValidation = maxValidator.validateSync(val);
        }
        if (minValidator && maxValidator && (minValidation || maxValidation)) {
            var innerMessage = null, message = sprintf(this.message || RangeValidator.DefaultMessage, this.minValue, this.maxValue);
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = sprintf(this.getContext().translate(this.message || RangeValidator.DefaultMessage), this.minValue, this.maxValue);
            }
            return {
                code:'ERANGE',
                maxValue:this.maxValue,
                message:message,
                innerMessage:innerMessage
            }
        }
        else if (minValidation) {
            return minValidation;
        }
        else if (maxValidation) {
            return maxValidation;
        }
    };
    /**
     * @class
     * @param {string|*} type - The data type which is going to be used for data validation
     * @property {*} dataType - Gets or sets the data type which is going to be used for data validation
     * @constructor
     * @augments {DataValidator}
     * @classdesc Validates a value against a pre-defined data type
     */
    function DataTypeValidator(type) {
        DataTypeValidator.super_.call(this);
        /**
         * @name DataTypeValidator#type
         * @type {*}
         */
        Object.defineProperty(this, 'dataType', {
            get: function() {
                if (typeof type === 'string') {
                    return this.getContext().getConfiguration().getStrategy(DataConfigurationStrategy).dataTypes[type];
                }
                else {
                    return type;
                }
            }
        });
    }

    LangUtils.inherits(DataTypeValidator, DataValidator);

    /**
     * @param val
     * @returns {*}
     */
    DataTypeValidator.prototype.validateSync = function(val) {
        var context = this.getContext();
        if (typeof this.dataType === 'undefined') {
            return null;
        }
        /**
         * @type {{pattern:string,patternMessage:string,minValue:*,maxValue:*,minLength:number,maxLength:number}}
         */
        var properties = this.dataType.properties;
        if (typeof properties !== 'undefined') {
            var validator, validationResult;
            //validate pattern if any
            if (properties.pattern) {
                validator = new PatternValidator(properties.pattern);
                validator.setContext(context);
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    if (properties.patternMessage) {

                        validationResult.message = properties.patternMessage;
                        if (context && (typeof context.translate === 'function')) {
                            validationResult.innerMessage = validationResult.message;
                            validationResult.message = context.translate(properties.patternMessage);
                        }
                    }
                    return validationResult;
                }
            }
            if (hasOwnProperty(properties, 'minValue') && hasOwnProperty(properties, 'maxValue')) {
                validator = new RangeValidator(properties.minValue, properties.maxValue);
                validator.setContext(context);
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    return validationResult;
                }
            }
            else if (hasOwnProperty(properties, 'minValue')) {
                validator = new MinValueValidator(properties.minValue);
                validator.setContext(context);
                if (properties.message) {
                    validator.message = properties.message;
                }
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    // try to return a localized message
                    if (context && (typeof context.translate === 'function')) {
                        validationResult.message = context.translate(properties.patternMessage);
                    }
                    return validationResult;
                }
            }
            else if (hasOwnProperty(properties, 'maxValue')) {
                validator = new MaxValueValidator(properties.maxValue);
                if (properties.message) {
                    validator.message = properties.message;
                }
                validator.setContext(context);
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    if (context && (typeof context.translate === 'function')) {
                        validationResult.message = context.translate(properties.patternMessage);
                    }
                    return validationResult;
                }
            }
            if (hasOwnProperty(properties, 'minLength')) {
                validator = new MinLengthValidator(properties.minLength);
                if (properties.message) {
                    validator.message = properties.message;
                }
                validator.setContext(context);
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    if (context && (typeof context.translate === 'function')) {
                        validationResult.message = context.translate(properties.patternMessage);
                    }
                    return validationResult;
                }
            }
            if (hasOwnProperty(properties, 'maxLength')) {
                validator = new MaxLengthValidator(properties.maxLength);
                if (properties.message) {
                    validator.message = properties.message;
                }
                validator.setContext(context);
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    if (context && (typeof context.translate === 'function')) {
                        validationResult.message = context.translate(properties.patternMessage);
                    }
                    return validationResult;
                }
            }
        }
    };
    /**
     * @class
     * @classdesc DataValidatorListener is one of the default listeners of MOST data models. Validates data objects against validation rules defined in model attributes.
     * @constructor
     */
    function DataValidatorListener() {
        //
    }

    /**
     * Occurs before creating or updating a data object.
     * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    DataValidatorListener.prototype.beforeSave = function(event, callback) {
        if (event.state === 4) { return callback(); }
        if (event.state === 1) {
            return event.model.validateForInsert(event.target).then(function() {
                return callback();
            }).catch(function(err) {
                return callback(err);
            });
        }
        else if  (event.state === 2) {
            return event.model.validateForUpdate(event.target).then(function() {
                return callback();
            }).catch(function(err) {
                return callback(err);
            });
        }
        else {
            return callback();
        }
    };

    /**
     * @class
     * @augments DataValidator
     * @constructor
     * @classdesc Validates a required attribute
     */
    function RequiredValidator() {
        RequiredValidator.super_.call(this);
    }
    LangUtils.inherits(RequiredValidator, DataValidator);
    /**
     * Validates the given value. If validation fails, the operation will return a validation result.
     * @param {*} val
     * @returns {{code: string, maxLength: number, message:string, innerMessage: string}|undefined|*}
     */
    RequiredValidator.prototype.validateSync = function(val) {
        var invalid = false;
        if (_.isNil(val)) {
            invalid=true;
        }
        else if ((typeof val === 'number') && isNaN(val)) {
            invalid=true;
        }
        // validate array
        if (Array.isArray(val)) {
            if (val.length===0) {
                invalid=true;
            }
        }
        if (invalid) {

            var innerMessage = null, message = 'A value is required.';
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = this.getContext().translate('A value is required.');
            }

            return {
                code:'EREQUIRED',
                message:message,
                innerMessage:innerMessage
            }

        }
    };

    function AsyncExecuteValidator(model, validator) {
        AsyncExecuteValidator.super_.call(this);
        Object.defineProperty(this, 'model', {
            enumerable: false,
            configurable: true,
            writable: true,
            value: model
        });
        Object.defineProperty(this, 'validator', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: validator
        });
    }
    LangUtils.inherits(AsyncExecuteValidator, DataValidator);

    AsyncExecuteValidator.prototype.validate = function(value, callback) {
        var self = this;
        try {
            this.validator({
                model: this.model,
                target: this.target,
                value: value
            }).then(function (result) {
                if (result) {
                    return callback();
                }
                var innerMessage = null;
                var message = self.message || 'Data validation failed.';
                var context = self.getContext();
                if (context && (typeof context.translate === 'function')) {
                    innerMessage = message;
                    message = context.translate('Data validation failed.');
                }
                return callback(null, {
                    code: 'EVALIDATE',
                    message: message,
                    innerMessage: innerMessage
                });
            }).catch(function (error) {
                return callback(error);
            });
        } catch (err) {
            return callback(err); 
        }
    }

    /**
     *
     * @param {string} additionalType
     * @param {number} state
     * @constructor
     */
    function JsonTypeValidator(additionalType, state) {
        // noinspection JSUnresolvedReference
        JsonTypeValidator.super_.call(this);
        this.state = state;
        this.additionalType = additionalType;
    }
    LangUtils.inherits(JsonTypeValidator, DataValidator);
    /**
     *
     * @param {*} val
     * @param {function(err?: *, validationResult?: *): void} callback
     * @returns {void}
     */
    JsonTypeValidator.prototype.validate = function(val, callback) {
        if (this.additionalType != null) {
            // noinspection ES6ConvertVarToLetConst
            /**
             * @type {DataContext}
             */
            var context = this.getContext();
            // noinspection ES6ConvertVarToLetConst
            var additionalModel = context.model(this.additionalType);
            if (additionalModel == null) {
                return callback(null, {
                    code:'E_MODEL',
                    message: sprintf('The additional model "%s" for Json type cannot be found.', this.additionalType)
                });
            }
            const values = Array.isArray(val) ? val : [val];
            const state = this.state;

            (async function() {
                // noinspection ES6ConvertVarToLetConst
                var res;
                // noinspection ES6ConvertVarToLetConst
                var attributes = additionalModel.attributeNames;
                for (const value of values) {
                    if (value != null) {
                        const keys = Object.keys(value);
                        const unknownKeys = keys.filter(function(k) {
                            return attributes.indexOf(k) < 0;
                        });
                        if (unknownKeys.length > 0) {
                            return {
                                code:'E_UNKNOWN',
                                message: sprintf('The target model "%s" does not contain attribute(s) %s.', additionalModel.name, unknownKeys.map(function(k) { return "\"" + k + "\"" }).slice(0, 5).join(', '))
                            };
                        }
                    }
                    if (state === 1) {
                        res = await additionalModel.validateForInsert(value);
                        if (res) return res;
                    } else if (state === 2) {
                        res = await additionalModel.validateForUpdate(value);
                        if (res) return res;
                    }
                }
            })().then(function(result) {
                return callback(null, result);
            }).catch(function(err) {
                return callback(err);
            });
        }
    };

    module.exports = {
        PatternValidator,
        DataValidator,
        MaxValueValidator,
        MinValueValidator,
        MaxLengthValidator,
        MinLengthValidator,
        RangeValidator,
        RequiredValidator,
        DataTypeValidator,
        AsyncExecuteValidator,
        DataValidatorListener,
        JsonTypeValidator
    };




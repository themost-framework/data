// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2021, THEMOST LP All rights reserved

const _ = require('lodash');
const { LangUtils } = require('@themost/common');
const { DataConfigurationStrategy } = require('./data-configuration');
const { hasOwnProperty } = require('./has-own-property');

/**
 * @class
 * @property {*} target - Gets or sets the target data object
 */
class DataValidator {
    constructor() {
        let context_;
        /**
         * Sets the current data context.
         * @param {DataContext|*} context
         */
        this.setContext = function (context) {
            context_ = context;
        };
        /**
         * Gets the current data context, if any.
         * @returns {DataContext|*}
         */
        this.getContext = function () {
            return context_;
        };
    }
}

function zeroPad_(number, length) {
    number = number || 0;
    let res = number.toString();
    while (res.length < length) {
        res = '0' + res;
    }
    return res;
}

/**
 * @class
 * @property {string} message - Gets or sets a string which represents a custom validator message.
 * @augments DataValidator
 * @classdesc Validates a variable against the regular expression provided
 */
class PatternValidator extends DataValidator {
    /**
     * @param {string} pattern - A string which represents a regular expression
     */
    constructor(pattern) {
        super();
        this.pattern = pattern;
    }
    /**
         * Validates the given value and returns a validation result or undefined if the specified value is invalid
         * @param val
         * @returns {{code: string, message: string, innerMessage: *}|undefined}
         */
    validateSync(val) {
        if (_.isNil(val)) {
            return;
        }
        let valueTo = val;
        if (val instanceof Date) {
            let year = val.getFullYear();
            let month = zeroPad_(val.getMonth() + 1, 2);
            let day = zeroPad_(val.getDate(), 2);
            let hour = zeroPad_(val.getHours(), 2);
            let minute = zeroPad_(val.getMinutes(), 2);
            let second = zeroPad_(val.getSeconds(), 2);
            let millisecond = zeroPad_(val.getMilliseconds(), 3);
            //format timezone
            let offset = (new Date()).getTimezoneOffset(),
                timezone = (offset >= 0 ? '+' : '') + zeroPad_(Math.floor(offset / 60), 2) + ':' + zeroPad_(offset % 60, 2);
            valueTo = year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second + '.' + millisecond + timezone;
        }
        let re = new RegExp(this.pattern, "ig");
        if (!re.test(valueTo)) {

            let innerMessage = null, message = this.message || PatternValidator.DefaultMessage;
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = this.getContext().translate(this.message || PatternValidator.DefaultMessage);
            }

            return {
                code: "E_PATTERN",
                "message": message,
                "innerMessage": innerMessage
            };
        }
    }
}
PatternValidator.DefaultMessage = "The value seems to be invalid.";

/**
 * @class
 * @property {number} minLength - Gets or sets an integer which represents the minimum length.
 * @property {string} message - Gets or sets a string which represents a custom validator message.
 * @augments {DataValidator}
 * @classdesc Validates a variable which has a length property (e.g. a string) against the minimum length provided
 */
class MinLengthValidator extends DataValidator {
    /**
     * 
     * @param {number} length - A number which represents the minimum length
     */
    constructor(length) {
        super();
        this.minLength = length;
    }
    /**
         * Validates the given value. If validation fails, the operation will return a validation result.
         * @param {*} val
         * @returns {{code: string, minLength: any, message:string, innerMessage: string | *} | *}
         */
    validateSync(val) {
        if (_.isNil(val)) {
            return;
        }
        if (hasOwnProperty(val, 'length')) {
            if (val.length < this.minLength) {

                let innerMessage = null;
                let message = this.message || MinLengthValidator.DefaultMessage;
                if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                    innerMessage = message;
                    message = this.getContext().translate(this.message || MinLengthValidator.DefaultMessage);
                }

                return {
                    code: "E_MIN_LEN",
                    minLength: this.minLength,
                    message: message,
                    innerMessage: innerMessage
                };

            }
        }
    }
}

MinLengthValidator.DefaultMessage = "The value is too short.";


/**
 * @class
 * @param {number} length - A number which represents the maximum length
 * @augments {DataValidator}
 * @property {number} maxLength - Gets or sets an integer which represents the maximum length.
 * @property {string} message - Gets or sets a string which represents a custom validator message.
 * @constructor
 * @classdesc Validates a variable which has a length property (e.g. a string) against the maximum length provided
 */
class MaxLengthValidator extends DataValidator {
    constructor(length) {
        super();
        this.maxLength = length;
    }
    /**
         * Validates the given value. If validation fails, the operation will return a validation result.
         * @param {*} val
         * @returns {{code: string, maxLength: number, message:string, innerMessage: string}|undefined|*}
         */
    validateSync(val) {
        if (_.isNil(val)) {
            return;
        }

        let innerMessage = null, message = this.message || MaxLengthValidator.DefaultMessage;
        if (this.getContext() && (typeof this.getContext().translate === 'function')) {
            innerMessage = message;
            message = this.getContext().translate(message);
        }
        if (hasOwnProperty(val, 'length')) {
            if (val.length > this.maxLength) {
                return {
                    code: "E_MAX_LEN",
                    maxLength: this.maxLength,
                    message: message,
                    innerMessage: innerMessage
                };
            }
        }
    }
}

MaxLengthValidator.DefaultMessage = "The value is too long.";


/**
 * @class
 * @param {number|Date|*} min - A value which represents the minimum value
 * @augments {DataValidator}
 * @property {*} minValue - Gets or sets a value which represents the minimum value.
 * @property {string} message - Gets or sets a string which represents a custom validator message.
 * @constructor
 * @classdesc Validates a value against the minimum value provided
 */
class MinValueValidator extends DataValidator {
    constructor(min) {
        super();
        this.minValue = min;
    }
    /**
         * Validates the given value. If validation fails, the operation will return a validation result.
         * @param {*} val
         * @returns {{code: string, maxLength: number, message:string, innerMessage: string}|undefined|*}
         */
    validateSync(val) {
        if (_.isNil(val)) {
            return;
        }
        if (val < this.minValue) {

            let innerMessage = null, message = this.message || MinValueValidator.DefaultMessage;
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = this.getContext().translate(this.message || MinValueValidator.DefaultMessage);
            }
            return {
                code: "E_MIN_VAL",
                minValue: this.minValue,
                message: message,
                innerMessage: innerMessage
            };
        }
    }
}


MinValueValidator.DefaultMessage = "The value should be greater than or equal from the required value.";
/**
 * @class
 * @param {number|Date|*} max - A value which represents the maximum value
 * @augments {DataValidator}
 * @property {*} maxValue - Gets or sets a value which represents the maximum value.
 * @property {string} message - Gets or sets a string which represents a custom validator message.
 * @constructor
 * @classdesc Validates a value against the maximum value provided
 */
class MaxValueValidator extends DataValidator {
    constructor(max) {
        super();
        this.maxValue = max;
    }
    /**
         * Validates the given value. If validation fails, the operation will return a validation result.
         * @param {*} val
         * @returns {{code: string, maxLength: number, message:string, innerMessage: string}|undefined|*}
         */
    validateSync(val) {
        if (_.isNil(val)) {
            return;
        }
        if (val > this.maxValue) {

            let innerMessage = null, message = this.message || MaxValueValidator.DefaultMessage;
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = this.getContext().translate(this.message || MaxValueValidator.DefaultMessage);
            }

            return {
                code: "E_MAX_VAL",
                maxValue: this.maxValue,
                message: message,
                innerMessage: innerMessage
            };
        }
    }
}


MaxValueValidator.DefaultMessage = "The value should be lower or equal with the specified value.";
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
class RangeValidator extends DataValidator {
    /**
     * 
        * @param {number|Date|*} min - A value which represents the minimum value
        * @param {number|Date|*} max - A value which represents the maximum value
     */
    constructor(min, max) {
        super();
        this.minValue = min;
        this.maxValue = max;
    }
    /**
         * Validates the given value. If validation fails, the operation will return a validation result.
         * @param {*} val
         * @returns {{code: string, maxLength: number, message:string, innerMessage: string}|undefined|*}
         */
    validateSync(val) {
        if (_.isNil(val)) {
            return;
        }
        let minValidator, maxValidator, minValidation, maxValidation;
        if (!_.isNil(this.minValue)) {
            minValidator = new MinValueValidator(this.minValue);
            minValidation = minValidator.validateSync(val);
        }
        if (!_.isNil(this.maxValue)) {
            maxValidator = new MaxValueValidator(this.maxValue);
            maxValidation = maxValidator.validateSync(val);
        }
        if (minValidator && maxValidator && (minValidation || maxValidation)) {
            let innerMessage = null, message = this.message || RangeValidator.DefaultMessage;
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = this.getContext().translate(this.message || RangeValidator.DefaultMessage);
            }
            return {
                code: "ERANGE",
                maxValue: this.maxValue,
                message: message,
                innerMessage: innerMessage
            };
        } else if (minValidation) {
            return minValidation;
        } else if (maxValidation) {
            return maxValidation;
        }
    }
}

RangeValidator.DefaultMessage = "The value should be between the specified values.";
/**
 * @class
 * @param {string|*} type - The data type which is going to be used for data validation
 * @property {*} dataType - Gets or sets the data type which is going to be used for data validation
 * @constructor
 * @augments {DataValidator}
 * @classdesc Validates a value against a pre-defined data type
 *
 */
class DataTypeValidator extends DataValidator {
    constructor(type) {
        super();
        /**
         * @name DataTypeValidator#type
         * @type {*}
         */
        Object.defineProperty(this, 'dataType', {
            get: function () {
                if (typeof type === 'string') {
                    return this.getContext().getConfiguration().getStrategy(DataConfigurationStrategy).dataTypes[type];
                } else {
                    return type;
                }
            }
        });
    }
    /**
         * @param val
         * @returns {*}
         */
    validateSync(val) {
        if (typeof this.dataType === 'undefined') {
            return;
        }
        /**
         * @type {{pattern:string,patternMessage:string,minValue:*,maxValue:*,minLength:number,maxLength:number}}
         */
        let properties = this.dataType.properties;
        if (typeof properties !== 'undefined') {
            let validator, validationResult;
            //validate pattern if any
            if (properties.pattern) {
                validator = new PatternValidator(properties.pattern);
                validator.setContext(this.getContext());
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    if (properties.patternMessage) {

                        validationResult.message = properties.patternMessage;
                        if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                            validationResult.innerMessage = validationResult.message;
                            validationResult.message = this.getContext().translate(properties.patternMessage);
                        }
                    }
                    return validationResult;
                }
            }
            if (hasOwnProperty(properties, 'minValue') && hasOwnProperty(properties, 'maxValue')) {
                validator = new RangeValidator(properties.minValue, properties.maxValue);
                validator.setContext(this.getContext());
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    return validationResult;
                }
            } else if (hasOwnProperty(properties, 'minValue')) {
                validator = new MinValueValidator(properties.minValue);
                validator.setContext(this.getContext());
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    return validationResult;
                }
            } else if (hasOwnProperty(properties, 'maxValue')) {
                validator = new MaxValueValidator(properties.maxValue);
                validator.setContext(this.getContext());
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    return validationResult;
                }
            }
            if (hasOwnProperty(properties, 'minLength')) {
                validator = new MinLengthValidator(properties.minLength);
                validator.setContext(this.getContext());
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    return validationResult;
                }
            }
            if (hasOwnProperty(properties, 'maxLength')) {
                validator = new MaxLengthValidator(properties.maxLength);
                validator.setContext(this.getContext());
                validationResult = validator.validateSync(val);
                if (validationResult) {
                    return validationResult;
                }
            }
        }
    }
}

LangUtils.inherits(DataTypeValidator, DataValidator);

/**
 * @class
 * @classdesc DataValidatorListener is one of the default listeners of MOST data models. Validates data objects against validation rules defined in model attributes.
 * @constructor
 */
class DataValidatorListener {
    constructor() {
        //
    }
    /**
         * Occurs before creating or updating a data object.
         * @param {DataEventArgs|*} event - An object that represents the event arguments passed to this operation.
         * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
         */
    beforeSave(event, callback) {
        if (event.state === 4) {
            return callback(); 
        }
        if (event.state === 1) {
            return event.model.validateForInsert(event.target).then(function () {
                return callback();
            }).catch(function (err) {
                return callback(err);
            });
        } else if (event.state === 2) {
            return event.model.validateForUpdate(event.target).then(function () {
                return callback();
            }).catch(function (err) {
                return callback(err);
            });
        } else {
            return callback();
        }
    }
}


/**
 * @class
 * @classdesc Validates a required attribute
 */
class RequiredValidator extends DataValidator {
    constructor() {
        super();
    }
    /**
         * Validates the given value. If validation fails, the operation will return a validation result.
         * @param {*} val
         * @returns {{code: string, maxLength: number, message:string, innerMessage: string}|undefined|*}
         */
    validateSync(val) {
        let invalid = false;
        if (_.isNil(val)) {
            invalid = true;
        } else if ((typeof val === 'number') && isNaN(val)) {
            invalid = true;
        }
        if (invalid) {

            let innerMessage = null, message = "A value is required.";
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = this.getContext().translate("A value is required.");
            }

            return {
                code: "E_REQUIRED",
                message: message,
                innerMessage: innerMessage
            };

        }
    }
}

module.exports = {
    DataValidator,
    PatternValidator,
    MaxValueValidator,
    MinValueValidator,
    MaxLengthValidator,
    MinLengthValidator,
    RangeValidator,
    RequiredValidator,
    DataTypeValidator,
    DataValidatorListener
};




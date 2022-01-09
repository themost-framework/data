// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
const _ = require('lodash');
const { sprintf } = require('sprintf-js');
const { DataConfigurationStrategy } = require('./data-configuration');
const { hasOwnProperty } = require('./has-own-property');

/**
 * @class
 * @property {*} target - Gets or sets the target data object
 */
class DataValidator {
    constructor() {
        let _context;
        /**
         * Sets the current data context.
         * @param {DataContext|*} context
         */
        this.setContext = function (context) {
            _context = context;
        };
        /**
         * Gets the current data context, if any.
         * @returns {DataContext|*}
         */
        this.getContext = function () {
            return _context;
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
 * @classdesc Validates a variable against the regular expression provided
 */
class PatternValidator extends DataValidator {
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
            let offset = (new Date()).getTimezoneOffset(), timezone = (offset >= 0 ? '+' : '') + zeroPad_(Math.floor(offset / 60), 2) + ':' + zeroPad_(offset % 60, 2);
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
                code: "EPATTERN",
                "message": message,
                "innerMessage": innerMessage
            };
        }
    }
}
PatternValidator.DefaultMessage = "The value seems to be invalid.";

/**
 * @classdesc Validates a variable which has a length property (e.g. a string) against the minimum length provided
 */
class MinLengthValidator extends DataValidator {
    constructor(length) {
        super();
        this.minLength = length;
    }
    /**
         * Validates the given value. If validation fails, the operation will return a validation result.
         * @param {*} val
         * @returns {{code: string, minLength: number, message:string, innerMessage: string}|undefined}
         */
    validateSync(val) {
        if (_.isNil(val)) {
            return;
        }
        if (hasOwnProperty(val, 'length')) {
            if (val.length < this.minLength) {

                let innerMessage = null, message = sprintf(this.message || MinLengthValidator.DefaultMessage, this.minLength);
                if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                    innerMessage = message;
                    message = sprintf(this.getContext().translate(this.message || MinLengthValidator.DefaultMessage), this.minLength);
                }

                return {
                    code: "EMINLEN",
                    minLength: this.minLength,
                    message: message,
                    innerMessage: innerMessage
                };

            }
        }
    }
}
MinLengthValidator.DefaultMessage = "The value is too short. It should have %s characters or more.";

/**
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

        let innerMessage = null, message = sprintf(this.message || MaxLengthValidator.DefaultMessage, this.maxLength);
        if (this.getContext() && (typeof this.getContext().translate === 'function')) {
            innerMessage = message;
            message = sprintf(this.getContext().translate(this.message || MaxLengthValidator.DefaultMessage), this.maxLength);
        }

        if (hasOwnProperty(val, 'length')) {
            if (val.length > this.maxLength) {
                return {
                    code: "EMAXLEN",
                    maxLength: this.maxLength,
                    message: message,
                    innerMessage: innerMessage
                };
            }
        }
    }
}

MaxLengthValidator.DefaultMessage = "The value is too long. It should have %s characters or fewer.";

/**
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

            let innerMessage = null, message = sprintf(this.message || MinValueValidator.DefaultMessage, this.minValue);
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = sprintf(this.getContext().translate(this.message || MinValueValidator.DefaultMessage), this.minValue);
            }

            return {
                code: "EMINVAL",
                minValue: this.minValue,
                message: message,
                innerMessage: innerMessage
            };
        }
    }
}

MinValueValidator.DefaultMessage = "The value should be greater than or equal to %s.";
/**
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

            let innerMessage = null, message = sprintf(this.message || MaxValueValidator.DefaultMessage, this.maxValue);
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = sprintf(this.getContext().translate(this.message || MaxValueValidator.DefaultMessage), this.maxValue);
            }

            return {
                code: "EMAXVAL",
                maxValue: this.maxValue,
                message: message,
                innerMessage: innerMessage
            };
        }
    }
}

MaxValueValidator.DefaultMessage = "The value should be lower or equal to %s.";
/**
 * @classdesc Validates a value against a minimum and maximum value
 */
class RangeValidator extends DataValidator {
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
            let innerMessage = null, message = sprintf(this.message || RangeValidator.DefaultMessage, this.minValue, this.maxValue);
            if (this.getContext() && (typeof this.getContext().translate === 'function')) {
                innerMessage = message;
                message = sprintf(this.getContext().translate(this.message || RangeValidator.DefaultMessage), this.minValue, this.maxValue);
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

RangeValidator.DefaultMessage = "The value should be between %s to %s.";
/**
 * @classdesc Validates a value against a pre-defined data type
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

/**
 * @classdesc DataValidatorListener is one of the default listeners of MOST data models. Validates data objects against validation rules defined in model attributes.
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
 * @classdesc Validates a required attribute
 */
class RequiredValidator extends DataValidator {
    constructor() {
        super()
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
                code: "EREQUIRED",
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


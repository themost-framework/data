
var {isPlainObject, isObjectLike, isNative} = require('lodash');

var objectToString = Function.prototype.toString.call(Object);

function isObjectDeep(any) {
    // check if it is a plain object
    var result = isPlainObject(any);
    if (result) {
        return result;
    }
    // check if it's object
    if (isObjectLike(any) === false) {
        return false;
    }
    // get prototype
    var proto = Object.getPrototypeOf(any);
    // if prototype exists, try to validate prototype recursively
    while(proto != null) {
        // get constructor
        var Ctor = Object.prototype.hasOwnProperty.call(proto, 'constructor')
            && proto.constructor;
        // check if constructor is native object constructor
        result = (typeof Ctor == 'function') && (Ctor instanceof Ctor)
            && Function.prototype.toString.call(Ctor) === objectToString;
        // if constructor is not object constructor and belongs to a native class
        if (result === false && isNative(Ctor) === true) {
            // return false
            return false;
        }
        // otherwise. get parent prototype and continue
        proto = Object.getPrototypeOf(proto);
    }
    // finally, return result
    return result;
}

module.exports = {
    isObjectDeep
}
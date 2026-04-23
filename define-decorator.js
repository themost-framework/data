/**
 *
 * @param {Object|Function} proto - The constructor function of a class or the prototype of a class
 * @param {string} key - The name of the property or method where the decorator will be included
 * @param {Function} decorator - The decorator to be included
 */
function defineDecorator(proto, key, decorator) {
    if ((typeof proto !== 'object') && (typeof proto !== 'function')) {
        throw new TypeError('Invalid prototype. Expected object or function.');
    }
    if (typeof key !== 'string') {
        throw new TypeError('Invalid property name. Expected string or function.');
    }
    if (typeof decorator !== 'function') {
        throw new TypeError('Invalid decorator. Expected function.');
    }
    decorator(proto, key, Object.getOwnPropertyDescriptor(proto, key));
}

//extend object
if (typeof Object.defineDecorator === 'undefined') {
    /**
     * @function defineDecorator
     * @param {Object|Function} proto - The constructor function of a class or the prototype of a class
     * @param {string} key - The name of the property or method where the decorator will be included
     * @param {Function} decorator - The decorator to be included
     * @memberOf Object
     * @static
     */
    Object.defineDecorator = defineDecorator;
}

module.exports = {
  defineDecorator
};

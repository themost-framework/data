const { DataError } = require('@themost/common');
const { sprintf } = require('sprintf-js');

class UnknownAttributeError extends DataError {
  /**
   * 
   * @param {string} entityType 
   * @param {string} attribute 
   */
  constructor(entityType, attribute) {
    super('ERR_ATTR_UNKNOWN',sprintf ('Attribute "%s" does not exist on entity type "%s"', attribute, entityType), null, entityType, attribute);
  }
}

module.exports = {
  UnknownAttributeError
}
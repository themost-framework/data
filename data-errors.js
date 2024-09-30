const { DataError } = require('@themost/common');
const { sprintf } = require('sprintf-js');

/**
   * @private
   * @param {string=} entityType 
   * @param {string=} attribute 
   * @returns 
   */
function formatUnknownAttributeMessage(entityType, attribute) {
  if (typeof entityType === 'string' || typeof attribute === 'string') {
    return sprintf('Attribute "%s" does not exist on entity type "%s"', attribute, entityType);
  }
  return null;
}

class UnknownAttributeError extends DataError {
  /**
   * 
   * @param {string=} entityType 
   * @param {string=} attribute 
   */
  constructor(entityType, attribute) {
    super('ERR_ATTR_UNKNOWN','The specified attribute does not exist on target entity type', formatUnknownAttributeMessage(entityType, attribute), entityType, attribute);
  }
  
}

module.exports = {
  UnknownAttributeError
}
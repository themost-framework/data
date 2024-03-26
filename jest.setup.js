const { TraceUtils } = require('@themost/common');
const { JsonLogger  } = require('@themost/json-logger');
TraceUtils.useLogger(new JsonLogger({
    format: 'raw'
}));
/* global jest */
jest.setTimeout(30000);

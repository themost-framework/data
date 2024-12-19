const { TraceUtils } = require('@themost/common');
const { JsonLogger  } = require('@themost/json-logger');
TraceUtils.useLogger(new JsonLogger({
    format: 'raw'
}));
/* env */
process.env.NODE_ENV = 'development';
/* global jest */
jest.setTimeout(60000);

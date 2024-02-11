const {TraceUtils} = require('@themost/common');
const JestLogger = require('./jest.logger');
TraceUtils.useLogger(new JestLogger());
/* global jest */
jest.setTimeout(30000);

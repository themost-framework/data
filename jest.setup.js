process.env.NODE_ENV = 'development';
const {TraceUtils} = require('@themost/common');
const JestLogger = require('./jest.logger');
// noinspection JSCheckFunctionSignatures
TraceUtils.useLogger(new JestLogger());
/* global jest */
jest.setTimeout(60000);

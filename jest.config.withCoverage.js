// eslint-disable-next-line node/no-unpublished-require
const config = require('./jest.config');
Object.assign(config, {
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['*.js', '!babel.config.js', '!jest.config.js', '!jest.config.withCoverage.js'],
});
module.exports = config;

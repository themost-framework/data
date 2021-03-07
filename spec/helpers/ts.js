const path = require('path');
require('ts-node').register({
    project: path.resolve(__dirname, '../../tsconfig.spec.json'),
    transpileOnly: true
});
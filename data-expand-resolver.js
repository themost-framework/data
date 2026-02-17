// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
var _ = require('lodash');
var {OpenDataParser} = require('@themost/query');

/**
 * @param {string} s
 * @returns {Array}
 * @private
 */
function testSplitExpandExpression(s) {
    const dataParser = new OpenDataParser();
    const matches = dataParser.parseExpandSequence(s).map(x=>{
        const match = [x.name]
        if (x.options ) {
            const keys = Object.keys(x.options);
            if (keys.length > 0) {
                match.push(Object.keys(x.options).filter(key => {
                    return x.options[key] != null
                }).map(key => `${key}=${x.options[key]}`).join(';'));
            }
        }
        return match;
    });
    return matches;

}

/**
 * @constructor
 */
function DataExpandResolver() {
    //
}
/**
 * Tests a string expression and returns an array of matched expandable entities
 * @param {string} s
 */
DataExpandResolver.prototype.testExpandExpression = function(s) {
    if (_.isNil(s)) {
        return [];
    }
    var result = [], reOptions = /(;|^)(\$expand|\$filter|\$levels|\$orderby|\$groupby|\$select|\$top|\$skip|\$search|\$count)=(.*?)(;\$|$)/ig;
    var matches = testSplitExpandExpression(s);
    for (var i = 0; i < matches.length; i++) {
        var match = matches[i];
        if (typeof match[1] === 'undefined') {
            result.push({ name:match[0].replace(/^\s+|\s+$/,'') });
        }
        else {
            var expand = { };
            expand['name'] = match[0].replace(/^\s+|\s+$/,'');
            reOptions.lastIndex = 0;
            var params = { };
            var expandOptions = match[1];
            var matchOption = reOptions.exec(expandOptions);
            while(matchOption) {
                if (matchOption[3]) {
                    params[matchOption[2]] = matchOption[3];
                    reOptions.lastIndex = reOptions.lastIndex-2;
                }
                matchOption = reOptions.exec(expandOptions);
            }
            expand.options = params;
            result.push(expand);
        }
    }
    return result;
};

/**
 * Tests a string expression and returns an array of matched expandable entities
 * @param {string} s
 */
 DataExpandResolver.prototype.test = function(s) {
    return this.testExpandExpression(s);
 }


if (typeof exports !== 'undefined')
{
    module.exports = {
        DataExpandResolver,
        testExpandExpression: function(s) {
            return DataExpandResolver.prototype.testExpandExpression(s);
        }
    };
}

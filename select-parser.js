const { OpenDataParser, Token } = require('@themost/query');

class SelectDataParser extends OpenDataParser {

    toList() {
        if (typeof this.source !== 'string') {
            return [];
        }
        this.current = 0;
        this.offset = 0;
        let result = [];
        let offset = 0;
        let token = this.getNext();
        while (token) {
            token.source = this.source.substring(offset, this.offset);
            token.offset = offset;
            offset = this.offset;
            result.push(token);
            token = this.getNext();
        }
        return result;
    }

    parseAsync(str) {
        const self = this;
        return new Promise(function (resolve, reject) {
            return self.parse(str, function (err, res) {
                if (err) {
                    return reject(err);
                }
                return resolve(res);
            })
        });
    }

    parseCommon(callback) {
        const self = this;
        if (self.nextToken == null) {
            return callback();
        }
        super.parseCommon(function (err, result) {
            if (err && err.message === 'Expected operator.') {
                if (self.currentToken.identifier === 'as') {
                    const nextToken = self.nextToken;
                    // next token should be an identifier
                    if (nextToken && nextToken.type === Token.TokenType.Identifier) {
                        // continue
                        return callback(null, result);
                    }
                }
                return callback(err);
            }
            return callback(null, result);
        });
    }

    parseCommonItem(callback) {
        return super.parseCommonItem(callback);
    }

}

class OrderByDataParser extends SelectDataParser {
    constructor() {
        super()
    }
    parseCommon(callback) {
        const self = this;
        super.parseCommon(function (err, result) {
            if (err && err.message === 'Expected operator.') {
                if (self.currentToken.identifier === 'asc' || self.currentToken.identifier === 'desc') {
                    const nextToken = self.nextToken;
                    // next token should be comma or null
                    if (nextToken == null) {
                        // continue
                        return callback(null, result);
                    }
                    if (nextToken.isComma()) {
                        // continue
                        return callback(null, result);
                    }
                }
                return callback(err);
            }
            return callback(null, result);
        });
    }
}

class SelectParser {
    constructor() {
        this.parser = new SelectDataParser();
    }

    parseAsync(str) {
        const parser = this.parser;
        return parser.parseAsync(str).then(function () {
            const tokens = parser.toList();
            if (tokens.length === 0) {
                return [];
            }
            const results = [];
            let i = 0;
            let token = tokens[i];
            let paren = 0;
            let indexStart = 0;
            let indexEnd;
            while (token) {
                if (token.isComma() && paren === 0) {
                    indexEnd = tokens[i - 1].offset + tokens[i - 1].source.length;
                    results.push(parser.source.substring(indexStart, indexEnd).trim());
                    // set offset
                    indexStart = indexEnd + 1;
                } else {
                    if (token.isParenOpen()) {
                        paren += 1;
                    } else if (token.isParenClose()) {
                        paren -= 1;
                    }
                }
                i += 1;
                if (i === tokens.length) {
                    results.push(parser.source.substring(indexStart, parser.source.length).trim());
                }
                token = tokens[i];
            }
            return Promise.resolve(results);
        });
    }

    /**
     * @param {string} str 
     * @returns {string[]}
     */
    parse(str) {
        if (typeof str !== 'string') {
            return [];
        }
        if (str.length === 0) {
            return [];
        } 
        let offset = 0;
        let start = 0;
        let paren = 0;
        let quote = 0;
        let charAt = '';
        const results = [];
        while(offset < str.length) {
            charAt = str.charAt(offset);
            if (charAt === ',' && paren === 0 && quote === 0) {
                results.push(str.substring(start, offset).trim());
                start = offset + 1;
            }
            // wait for paren close
            if (charAt === '(' && quote === 0) {
                paren += 1;
            }
            // handle paren close
            if (charAt === ')' && quote === 0) {
                paren -= 1;
            }
            // handle quote (or quote inside quotes)
            // e.g indexOf(giveName, 'Alexis') or indexOf(name, 'Tablet\'s')
            if (charAt === '\'' && quote === 0) {
                quote += 1;
            } else if (charAt === '\'' && quote > 0) {
                quote -= 1;
            }
            offset += 1;
            if (offset === str.length) {
                results.push(str.substring(start, offset).trim());
            }
        }
        if (quote !== 0) {
            throw new Error('Unterminated string constant');
        }
        if (paren !== 0) {
            throw new Error('Expected closing parenthesis');
        }
        return results;

    }

}

class OrderByParser extends SelectParser {
    constructor() {
        super();
        this.parser = new OrderByDataParser();
    }
}

class GroupByParser extends SelectParser {
    constructor() {
        super();
    }
}

module.exports = {
    SelectParser,
    OrderByParser,
    GroupByParser
}
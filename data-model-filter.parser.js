const { AsyncSeriesEventEmitter } = require('@themost/events');
const { OpenDataParser } = require('@themost/query');
const { DataAttributeResolver } = require('./data-attribute-resolver');
const { DataFilterResolver } = require('./data-filter-resolver');

class DataModelFilterParser {
    /**
     * 
     * @param {import("./data-model").DataModel} model 
     */
    constructor(model) {
        this.resolvingMember = new AsyncSeriesEventEmitter();
        this.resolvingMethod = new AsyncSeriesEventEmitter();
        this.model = model;
    }
    parse(str, callback) {
        const self = this;
        const thisModel = this.model;
        const $expand = [];
        const parser = new OpenDataParser();
        parser.resolveMember = function(member, cb) {
            const attr = thisModel.field(member);
            if (attr) {
                member = attr.name;
                if (attr.multiplicity === 'ZeroOrOne') {
                    var mapping1 = thisModel.inferMapping(member);
                    if (mapping1 && mapping1.associationType === 'junction' && mapping1.parentModel === thisModel.name) {
                        member = attr.name.concat('/', mapping1.childField);
                    } else if (mapping1 && mapping1.associationType === 'junction' && mapping1.childModel === thisModel.name) {
                        member = attr.name.concat('/', mapping1.parentField);
                    }
                }
            }
            const event = {
                target: self,
                member: member,
                result: null
            }
            void self.resolvingMember.emit(event).then(() => {
                if (event.result) {
                    return cb(null, event.result.$select);
                }
                if (DataAttributeResolver.prototype.testNestedAttribute.call(thisModel,member)) {
                    try {
                        var member1 = member.split('/'),
                            mapping = thisModel.inferMapping(member1[0]),
                            expr;
                        if (mapping && mapping.associationType === 'junction') {
                            var expr1 = DataAttributeResolver.prototype.resolveJunctionAttributeJoin.call(thisModel, member);
                            expr = {
                                $expand: expr1.$expand
                            };
                            //replace member expression
                            member = expr1.$select.$name.replace(/\./g,'/');
                        }
                        else {
                            expr = DataAttributeResolver.prototype.resolveNestedAttributeJoin.call(thisModel, member);
                            if (expr.$select) {
                                member = expr.$select.$name.replace(/\./g,'/');
                            }
                        }
                        if (expr && expr.$expand) {
                            var arrExpr = [];
                            if (Array.isArray(expr.$expand)) {
                                arrExpr.push.apply(arrExpr, expr.$expand);
                            } else {
                                arrExpr.push(expr.$expand);
                            }
                            arrExpr.forEach(function(y) {
                                var joinExpr = $expand.find(function(x) {
                                    if (x.$entity && x.$entity.$as) {
                                        return (x.$entity.$as === y.$entity.$as);
                                    }
                                    return false;
                                });
                                if (joinExpr == null)
                                    $expand.push(y);
                            });
                        }
                    }
                    catch (err) {
                        return cb(err);
                    }
                }
                if (typeof thisModel.resolveMember === 'function') {
                    thisModel.resolveMember.call(thisModel, member, cb);
                } else {
                    DataFilterResolver.prototype.resolveMember.call(thisModel, member, cb);
                }
            }).catch(function(err) {
                return callback(err);
            });
            
        }

        parser.resolveMethod = function(name, args, cb) {
            const thisModel = self.model;
            const event = {
                target: self,
                method: name,
                args: args,
                result: null
            }
            void self.resolvingMethod.emit(event).then(function() {
                if (event.result) {
                    return cb(null, event.result);
                }
                if (typeof thisModel.resolveMethod === 'function') {
                    thisModel.resolveMethod.call(thisModel, name, args, cb);
                } else {
                    DataFilterResolver.prototype.resolveMethod.call(thisModel, name, args, cb);
                }
            }).catch(function(err) {
                return cb(err);
            });
        }

        void parser.parse(str, function(err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, {
                $where: result,
                $expand: $expand
            });
        });
    }
    parseAsync(str) {
        const self = this;
        return new Promise(function(resolve, reject) {
            void self.parse(str, function(err, result) {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        });
    }
}

module.exports = {
    DataModelFilterParser
}
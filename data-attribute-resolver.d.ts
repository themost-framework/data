import {MethodCallExpression, QueryEntity, QueryField} from '@themost/query';

export declare class DataAttributeResolver {
    orderByNestedAttribute(attr: string): any;
    selectNestedAttribute(attr: string): any;
    selectAggregatedAttribute(aggregation: string, attribute: string, alias: string): any;
    resolveNestedAttribute(attr: string): any;
    resolveNestedAttributeJoin(memberExpr: string): { $select?: QueryField | MethodCallExpression, $expand?: QueryEntity[] };
    testAttribute(s: string): any;
    testAggregatedNestedAttribute(s: string): any;
    testNestedAttribute(s: string): any;
    resolveJunctionAttributeJoin(attr: string): { $select?: QueryField | MethodCallExpression, $expand?: QueryEntity[] };
}

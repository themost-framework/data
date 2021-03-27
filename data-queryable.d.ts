import {DataModel} from "./data-model";
import {DataContextEmitter} from "./types";

declare type DataQueryableCallback = (err?: Error, res?: any) => void;

declare interface ListResult {
    total?: number;
    skip?: number;
    value: Array<any>;
}

export declare class DataQueryable implements DataContextEmitter {
    constructor(model?: DataModel);
    readonly model: DataModel;
    clone(): DataQueryable;
    where(attr: string): DataQueryable;
    search(text: string): DataQueryable;
    join(model: string): DataQueryable;
    and(attr: string): DataQueryable;
    or(attr: string): DataQueryable;
    prepare(orElse?: boolean): DataQueryable;
    is(value: any): DataQueryable;
    equal(value: any): DataQueryable;
    notEqual(value: any): DataQueryable;
    greaterThan(value: any): DataQueryable;
    greaterOEqual(value: any): DataQueryable;
    bit(value: any, result?:number): DataQueryable;
    lowerThan(value: any): DataQueryable;
    lowerOrEqual(value: any): DataQueryable;
    startsWith(value: any): DataQueryable;
    endsWith(value: any): DataQueryable;
    contains(value: any): DataQueryable;
    notContains(value: any): DataQueryable;
    between(value1: any, value2: any): DataQueryable;
    select(...attr: any[]): DataQueryable;
    orderBy(attr: any): DataQueryable;
    orderByDescending(attr: any): DataQueryable;
    thenBy(attr: any): DataQueryable;
    thenByDescending(attr: any): DataQueryable;
    groupBy(...attr: any[]): DataQueryable;
    skip(n:number): DataQueryable;
    take(n:number): DataQueryable;
    getItem(): Promise<any>;
    getItems(): Promise<Array<any>>;
    getTypedItem(): Promise<any>;
    getTypedItems(): Promise<Array<any>>;
    getList(): Promise<ListResult>;
    getTypedList(): Promise<ListResult>;
    getAllItems(): Promise<Array<any>>;
    count(): Promise<number>;
    value(): Promise<any>;
    min(attr: any): Promise<any>;
    max(attr: any): Promise<any>;
    average(attr: any): Promise<any>;
    migrate(callback:(err?: Error) => void): void;
    silent(value?: boolean): DataQueryable;
    flatten(value?: boolean): DataQueryable;
    cache(value?: boolean): DataQueryable;
    data(name: string, value?: any): DataQueryable|any;
    title(value?: string): DataQueryable|string;
    toMD5(): string;
    expand(...attr: any[]): DataQueryable;
    hasExpand(attr: any): boolean;
    add(x: any): DataQueryable;
    subtract(x: any): DataQueryable;
    multiply(x: any): DataQueryable;
    divide(x: any): DataQueryable;
    round(n?:number): DataQueryable;
    substr(start: number, length?:number): DataQueryable;
    indexOf(s: string): DataQueryable;
    concat(s: string): DataQueryable;
    trim(): DataQueryable;
    length(): DataQueryable;
    getDate(): DataQueryable;
    getYear(): DataQueryable;
    getMonth(): DataQueryable;
    getDay(): DataQueryable;
    getFullYear(): DataQueryable;
    getMinutes(): DataQueryable;
    getSeconds(): DataQueryable;
    getHours(): DataQueryable;
    floor(): DataQueryable;
    ceil(): DataQueryable;
    toLowerCase(): DataQueryable;
    toLocaleLowerCase(): DataQueryable;
    toUpperCase(): DataQueryable;
    toLocaleUpperCase(): DataQueryable;
    levels(n:number): DataQueryable;
    getLevels(): number;
    toExpand(): string;

    ensureContext: void;
}

export declare class DataAttributeResolver {
    orderByNestedAttribute(attr: string): any;
    selectNestedAttribute(attr: string): any;
    selectAggregatedAttribute(aggregation: string, attribute: string, alias: string): any;
    resolveNestedAttribute(attr: string): any;
    resolveNestedAttributeJoin(memberExpr: string): any;
    testAttribute(s: string): any;
    testAggregatedNestedAttribute(s: string): any;
    testNestedAttribute(s: string): any;
    resolveJunctionAttributeJoin(attr: string): any;
}

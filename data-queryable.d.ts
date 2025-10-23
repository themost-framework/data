// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataModel} from "./data-model";
import {DataContextEmitter} from "./types";
import {QueryExpression, QueryFunc} from '@themost/query';
export declare class DataQueryable implements DataContextEmitter {
    constructor(model: DataModel);
    readonly model: DataModel;
    readonly query: QueryExpression;
    clone(): this;
    where<T>(expr: (value: T, ...param: any) => any, params?: any): this;
    where(attr: string): this;
    search(text: string): this;
    join(model: string | DataModel): this;
    and(attr: string): this;
    or(attr: string): this;
    prepare(orElse?: boolean): this;
    is(value: any): this;
    equal(value: any): this;
    notEqual(value: any): this;
    in(...attr: any[]): this;
    notIn(...attr: any[]): this;
    greaterThan(value: any): this;
    greaterOrEqual(value: any): this;
    bit(value: any, result?:number): this;
    lowerThan(value: any): this;
    lowerOrEqual(value: any): this;
    startsWith(value: any): this;
    endsWith(value: any): this;
    contains(value: any): this;
    notContains(value: any): this;
    between(value1: any, value2: any): this;
    select<T>(expr: (value: T, ...param: any) => any, params?: any): this;
    select<T,J>(expr: (value1: T, value2: J, ...param: any) => any, params?: any): this;
    select(...attr: any[]): this;
    orderBy(attr: any): this;
    orderBy<T>(expr: (value: T) => any): this;
    orderByDescending(attr: any): this;
    orderByDescending<T>(expr: (value: T) => any): this;
    thenBy(attr: any): this;
    thenBy<T>(expr: (value: T) => any): this;
    thenByDescending(attr: any): this;
    thenByDescending<T>(expr: (value: T) => any): this;
    groupBy(...attr: any[]): this;
    groupBy<T>(...args: [...expr:[(value: T) => any], ...params: any[]]): this;
    groupBy<T>(arg1: QueryFunc<T>, arg2: QueryFunc<T>, ...params: any[]): this;
    groupBy<T>(arg1: QueryFunc<T>, arg2: QueryFunc<T>, arg3: QueryFunc<T>, ...params: any[]): this;
    groupBy<T>(arg1: QueryFunc<T>, arg2: QueryFunc<T>, arg3: QueryFunc<T>,
               arg4: QueryFunc<T>, ...params: any[]): this;
    groupBy<T>(arg1: QueryFunc<T>, arg2: QueryFunc<T>, arg3: QueryFunc<T>,
               arg4: QueryFunc<T>, arg5: QueryFunc<T>, ...params: any[]): this;
    groupBy<T>(arg1: QueryFunc<T>, arg2: QueryFunc<T>, arg3: QueryFunc<T>,
               arg4: QueryFunc<T>, arg5: QueryFunc<T>, arg6: QueryFunc<T>, ...params: any[]): this;
    groupBy<T>(arg1: QueryFunc<T>, arg2: QueryFunc<T>, arg3: QueryFunc<T>,
               arg4: QueryFunc<T>, arg5: QueryFunc<T>, arg6: QueryFunc<T> , arg7: QueryFunc<T>, ...params: any[]): this;
    skip(n:number): this;
    take(n:number): this;
    getItem(): Promise<any>;
    getItems(): Promise<Array<any>>;
    getTypedItem(): Promise<any>;
    getTypedItems(): Promise<Array<any>>;
    getList(): Promise<any>;
    getTypedList(): Promise<any>;
    getAllItems(): Promise<Array<any>>;
    count(): Promise<number>;
    value(): Promise<any>;
    min(): Promise<any>;
    max(): Promise<any>;
    average(): Promise<any>;
    migrate(callback:(err?: Error) => void): void;
    silent(value?: boolean): this;
    flatten(value?: boolean): this;
    cache(value?: boolean): this;
    data(name: string): any;
    data(name: string, value: any): this;
    title(): string;
    title(value: string): this;
    toMD5(): string;
    expand(...attr: any[]): this;
    hasExpand(attr: any): boolean;
    add(x: any): this;
    subtract(x: any): this;
    multiply(x: any): this;
    divide(x: any): this;
    round(n?:number): this;
    substr(start: number, length?:number): this;
    indexOf(s: string): this;
    concat(s: string): this;
    trim(): this;
    length(): this;
    getDate(): this;
    getYear(): this;
    getMonth(): this;
    getDay(): this;
    getFullYear(): this;
    getMinutes(): this;
    getSeconds(): this;
    getHours(): this;
    floor(): this;
    ceil(): this;
    toLowerCase(): this;
    toLocaleLowerCase(): this;
    toUpperCase(): this;
    toLocaleUpperCase(): this;
    levels(n:number): this;
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

export declare class DataValueResolver {
    constructor(target: DataQueryable);
    resolve(value: any): string
}

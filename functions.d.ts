// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataContext} from "./types";
import {DataModel} from "./data-model";

export declare class FunctionContext {
    constructor(context?: DataContext, model?: DataModel, target?: any);
    context?: DataContext;
    model?: DataModel;
    target?: any;
    now(): Promise<Date>;
    today(): Promise<Date>;
    newid(): Promise<any>;
    newGuid(): Promise<string>;
    int(min?: number, max?: number): Promise<number>;
    numbers(length: number): Promise<string>;
    chars(length: number): Promise<string>;
    password(length: number): Promise<string>;
    user(): Promise<any>;
    me(): Promise<any>;
}

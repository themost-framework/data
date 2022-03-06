// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import { DataModel } from "./data-model";
import {DataAdapter, DataContext} from "./types";

export declare class DefaultDataContext extends DataContext {
    model(name: any): DataModel;
    constructor();
    db: DataAdapter;
    finalize(callback?: (err?: Error) => void): void;
    readonly name: string;
}

export declare class NamedDataContext extends DataContext {
    model(name: any): DataModel;
    constructor(name: string);
    db: DataAdapter;
    finalize(callback?: (err?: Error) => void): void;
    readonly name: string;
    getName(): string;
}

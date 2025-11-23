// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import { ConfigurationBase } from '@themost/common';
import { DataModel } from './data-model';
import {DataAdapter, DataContext} from "./types";

export declare class DefaultDataContext extends DataContext {
    model(name: any): DataModel;
    getConfiguration(): ConfigurationBase;
    finalize(callback?: (err?: Error) => void): void;
    constructor();
    readonly name: string;
    getDb(): DataAdapter;
    setDb(db: DataAdapter): void;
}

export declare class NamedDataContext extends DataContext {
    model(name: any): DataModel;
    getConfiguration(): ConfigurationBase;
    finalize(callback?: (err?: Error) => void): void;
    constructor(name: string);
    readonly name: string;
    getName(): string
    getDb(): DataAdapter;
    setDb(db: DataAdapter): void;
}

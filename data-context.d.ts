// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import { DataModel } from "data-model";
import {DataAdapter, DataContext} from "./types";
import { ConfigurationBase, DataAdapterBase } from '@themost/common';

export declare class DefaultDataContext extends DataContext {
    model(name: any): DataModel;
    getConfiguration(): ConfigurationBase;
    finalize(callback?: (err?: Error) => void): void;
    constructor();
    readonly name: string;
    getDb(): DataAdapterBase;
    setDb(db: DataAdapterBase): void;
}

export declare class NamedDataContext extends DataContext {
    model(name: any): DataModel;
    getConfiguration(): ConfigurationBase;
    finalize(callback?: (err?: Error) => void): void;
    constructor(name: string);
    readonly name: string;
    getName(): string
    getDb(): DataAdapterBase;
    setDb(db: DataAdapterBase): void;
}

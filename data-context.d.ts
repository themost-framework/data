// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataAdapter, DataContext} from "./types";

export declare class DefaultDataContext extends DataContext {
    constructor();
    readonly name: string;
    getDb(): DataAdapter;
    setDb(db: DataAdapter): void;
}

export declare class NamedDataContext extends DataContext {
    constructor(name: string);
    readonly name: string;
    getName(): string
    getDb(): DataAdapter;
    setDb(db: DataAdapter): void;
}

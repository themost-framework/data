// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataAdapter, DataContext} from "./types";

export declare class DefaultDataContext extends DataContext {
    protected _db: DataAdapter;
    readonly name: string;
    constructor();
    finalize(callback?: (err?: Error) => void): void;
    getDb(): DataAdapter;
    setDb(db: DataAdapter): void;
}

export declare class NamedDataContext extends DefaultDataContext {
    constructor(name: string);
    getName(): string;
}

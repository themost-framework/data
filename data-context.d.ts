// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import { Observable } from 'rxjs';
import {DataContext} from "./types";
import { ConfigurationBase, DataAdapterBase } from '@themost/common';
import { DataModel } from 'data-model';

export declare class DefaultDataContext extends DataContext {
    model(name: any): DataModel;
    getConfiguration(): ConfigurationBase;
    finalize(callback?: (err?: Error) => void): void;
    constructor();
    readonly name: string;
}

export declare class NamedDataContext extends DataContext {
    model(name: any): DataModel;
    getConfiguration(): ConfigurationBase;
    finalize(callback?: (err?: Error) => void): void;
    constructor(name: string);
    readonly name: string;
    getName(): string;
}

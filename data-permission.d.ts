// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {DataModel} from "./data-model";
import {DataQueryable} from "./data-queryable";
import {BeforeExecuteEventListener, BeforeRemoveEventListener, BeforeSaveEventListener, DataEventArgs} from "./types";

export declare class DataPermissionEventArgs {
    model: DataModel;
    query: any;
    mask: number;
    privilege: string;
    parentPrivilge?: string;
    emitter?: DataQueryable;
    throwError?: boolean;
}

export declare class PermissionMask {
    static Read: number;
    static Create: number;
    static Update: number;
    static Delete: number;
    static Execute: number;
    static Owner: number;
}

export declare class DataPermissionEventListener implements BeforeSaveEventListener,
    BeforeRemoveEventListener,
    BeforeExecuteEventListener
{
    beforeSave(event: DataEventArgs, callback: (err?: Error) => void): void;

    beforeRemove(event: DataEventArgs, callback: (err?: Error) => void): void;

    beforeExecute(event: DataEventArgs, callback: (err?: Error) => void): void;

    validate(event: DataEventArgs, callback: (err?: Error) => void): void;
}

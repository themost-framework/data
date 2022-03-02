// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import { DataError } from "@themost/common";
import {AfterSaveEventListener, BeforeSaveEventListener, DataEventArgs} from "./types";

export declare class DataObjectAssociationError extends DataError {
    constructor(model?: string, field?: string);
}

export declare class DataObjectMultiAssociationError extends DataError {
    constructor(model?: string, field?: string);
}

export declare class DataObjectAssociationListener implements BeforeSaveEventListener, AfterSaveEventListener {
    afterSave(event: DataEventArgs, callback: (err?: Error) => void): void;
    beforeSave(event: DataEventArgs, callback: (err?: Error) => void): void;
}
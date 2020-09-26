// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {AfterSaveEventListener, BeforeRemoveEventListener, BeforeSaveEventListener, DataEventArgs} from "./types";

export declare class DataNestedObjectListener implements BeforeSaveEventListener, AfterSaveEventListener, BeforeRemoveEventListener {
    afterSave(event: DataEventArgs, callback: (err?: Error) => void): void;

    beforeRemove(event: DataEventArgs, callback: (err?: Error) => void): void;

    beforeSave(event: DataEventArgs, callback: (err?: Error) => void): void;

}

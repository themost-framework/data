// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {AfterSaveEventListener, BeforeSaveEventListener, DataEventArgs} from "./types";

export declare class DataObjectAssociationListener implements BeforeSaveEventListener, AfterSaveEventListener {
    afterSave(event: DataEventArgs, callback: (err?: Error) => void): void;

    beforeSave(event: DataEventArgs, callback: (err?: Error) => void): void;

}

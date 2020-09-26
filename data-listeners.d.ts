// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {
    AfterExecuteEventListener,
    AfterUpgradeEventListener,
    BeforeExecuteEventListener,
    BeforeSaveEventListener,
    DataEventArgs
} from "./types";

export declare class NotNullConstraintListener implements BeforeSaveEventListener {
    beforeSave(event: DataEventArgs, callback: (err?: Error) => void): void;

}

export declare class UniqueConstraintListener implements BeforeSaveEventListener {
    beforeSave(event: DataEventArgs, callback: (err?: Error) => void): void;

}

export declare class CalculatedValueListener implements BeforeSaveEventListener {
    beforeSave(event: DataEventArgs, callback: (err?: Error) => void): void;

}

export declare class DataCachingListener implements BeforeExecuteEventListener, AfterExecuteEventListener {
    afterExecute(event: DataEventArgs, callback: (err?: Error) => void): void;

    beforeExecute(event: DataEventArgs, callback: (err?: Error) => void): void;

}

export declare class DefaultValueListener implements BeforeSaveEventListener {
    beforeSave(event: DataEventArgs, callback: (err?: Error) => void): void;

}

export declare class DataModelCreateViewListener implements AfterUpgradeEventListener {
    afterUpgrade(event: DataEventArgs, callback: (err?: Error) => void): void;

}

export declare class DataModelSeedListener implements AfterUpgradeEventListener {
    afterUpgrade(event: DataEventArgs, callback: (err?: Error) => void): void;

}

export declare class DataModelSubTypesListener implements AfterUpgradeEventListener {
    afterUpgrade(event: DataEventArgs, callback: (err?: Error) => void): void;

}


// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {BeforeRemoveEventListener, DataEventArgs} from "./types";

export declare class DataReferencedObjectListener implements BeforeRemoveEventListener{
    beforeRemove(event: DataEventArgs, callback: (err?: Error) => void): void;

}

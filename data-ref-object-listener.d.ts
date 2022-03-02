// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {BeforeRemoveEventListener, DataEventArgs} from "./types";

export declare class DataReferencedObjectListener implements BeforeRemoveEventListener{
    beforeRemove(event: DataEventArgs, callback: (err?: Error) => void): void;

}

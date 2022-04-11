// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {BeforeExecuteEventListener, DataEventArgs} from "./types";

export declare class OnExecuteNestedQueryable implements BeforeExecuteEventListener {
    beforeExecute(event: DataEventArgs, callback: (err?: Error) => void): void;
}

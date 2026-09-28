import { BeforeExecuteEventListener, DataEventArgs} from './types';

export declare class OnBeforeGetExpandableAssociation implements BeforeExecuteEventListener {
    beforeExecute(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare class OnBeforeGetExpandableTag implements BeforeExecuteEventListener {
    beforeExecute(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare class OnBeforeGetExpandableJunction implements BeforeExecuteEventListener {
    beforeExecute(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare class OnBeforeGetExpandableChildren implements BeforeExecuteEventListener {
    beforeExecute(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare class OnBeforeGetAnyExpandable implements BeforeExecuteEventListener {
    beforeExecute(event: DataEventArgs, callback: (err?: Error) => void): void;
}
import { DataContext } from "./types";

export declare function executeInUnattendedMode(context: DataContext, func: (callback: (err?: Error) => void) => void, callback: (err?: Error) => void): void;
export declare function executeInUnattendedModeAsync(context: DataContext, func: () => Promise<void>): Promise<void>;
export declare function enableUnattendedExecution(app: any, account: string): void;
export declare function disableUnattendedExecution(app: any): void;
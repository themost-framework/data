import { DataContext } from "./types";
import {ConfigurationBase} from '@themost/common';

export declare interface ConfigurableApplication {
    getConfiguration(): ConfigurationBase
}

export declare function executeInUnattendedMode(context: DataContext, func: (callback: (err?: Error) => void) => void, callback: (err?: Error) => void): void;
export declare function executeInUnattendedModeAsync(context: DataContext, func: () => Promise<void>): Promise<void>;
export declare function enableUnattendedExecution(app: ConfigurableApplication, account?: string): void;
export declare function disableUnattendedExecution(app: ConfigurableApplication): void;

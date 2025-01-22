import { DataModelBase } from "@themost/common";
import { AsyncSeriesEventEmitter } from '@themost/events';
import { DataContext } from "./types";
import { DataModel } from './data-model';

export declare interface ResolvingVariable {
    name: string;
    model?: DataModelBase;
    context?: DataContext;
    target?: any;
    value?: any;
}


/**
 * Class responsible for formatting values within a given data context.
 */
export declare class ValueFormatter {

    readonly resolvingVariable: AsyncSeriesEventEmitter<ResolvingVariable>;
    /**
     * Creates an instance of ValueFormatter.
     * @param context - The data context in which the formatter operates.
     */
    constructor(context: DataContext, model?: DataModel, target?: any);

    /**
     * Formats the given value according to the rules defined in the data context.
     * @param value - The value to be formatted.
     * @returns The formatted value.
     */
    format(value: unknown): any;

    static register(name: string, definition: { [k: string]:  (...value: any[]) => Promise<any> }): void;
}

export declare class ValueDialect {
    /**
     * Creates an instance of ValueDialect.
     * @param context - The data context in which the dialect operates.
     */
    constructor(context: DataContext, model: DataModel, target: any);

}

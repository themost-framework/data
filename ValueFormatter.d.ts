import { DataContext } from "types";



/**
 * Class responsible for formatting values within a given data context.
 */
export declare class ValueFormatter {
    /**
     * Creates an instance of ValueFormatter.
     * @param context - The data context in which the formatter operates.
     */
    constructor(context: DataContext);

    /**
     * Formats the given value according to the rules defined in the data context.
     * @param value - The value to be formatted.
     * @returns The formatted value.
     */
    format(value: unknown): any;
}

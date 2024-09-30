import { DataError } from '@themost/common';

export declare class UnknownAttributeError extends DataError {
    constructor(model: string, attribute: string);
}
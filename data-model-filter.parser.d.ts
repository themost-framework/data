import { AsyncSeriesEventEmitter } from '@themost/events';
import { DataModel } from './data-model';

export declare class DataModelFilterParser {
    constructor(model: DataModel);
    resolvingMember: AsyncSeriesEventEmitter<{ target: DataModelFilterParser, member: string, result: { $select: any, $expand?: any } }>;
    resolvingMethod: AsyncSeriesEventEmitter<{ target: DataModelFilterParser, method: string, args: any, result: any }>;
    parseAsync(str: string): Promise<{ $where: any, $expand?: any }>;
}
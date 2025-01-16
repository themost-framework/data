import { DataCacheStrategy } from '../data-cache';

export declare class MemoryCacheStrategy extends DataCacheStrategy {
    add(key: string, value: any, absoluteExpiration?: number): Promise<any>;
    remove(key: string): Promise<any>;
    clear(): Promise<void>;
    get<T>(key: string): Promise<T>;
    getOrDefault<T>(key: string, getFunc: () => Promise<T>, absoluteExpiration?: number): Promise<T>;
}
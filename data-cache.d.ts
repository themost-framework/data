// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {ConfigurationStrategy} from "@themost/common";

export declare interface DataCacheStrategyBase {
    add(key: string, value: any, absoluteExpiration?: number): Promise<any>;
    remove(key: string): Promise<any>;
    clear(): Promise<void>;
    get<T>(key: string): Promise<T>;
    getOrDefault<T>(key: string, getFunc: () => Promise<T>, absoluteExpiration?: number): Promise<T>;
}

export declare interface DataCacheFinalize extends DataCacheStrategyBase {
    finalize(): Promise<void>;
}

export declare abstract class DataCacheStrategy extends ConfigurationStrategy implements DataCacheStrategyBase {

    abstract add(key: string, value: any, absoluteExpiration?: number): Promise<any>;
    abstract remove(key: string): Promise<any>;
    abstract clear(): Promise<void>;
    abstract get<T>(key: string): Promise<T>;
    abstract getOrDefault<T>(key: string, getFunc: () => Promise<T>, absoluteExpiration?: number): Promise<T>;

}

export declare class DefaultDataCacheStrategy extends DataCacheStrategy implements DataCacheFinalize {

    add(key: string, value: any, absoluteExpiration?: number): Promise<any>;
    remove(key: string): Promise<any>;
    clear(): Promise<void>;
    get<T>(key: string): Promise<T>;
    getOrDefault<T>(key: string, getFunc: () => Promise<T>, absoluteExpiration?: number): Promise<T>;
    finalize(): Promise<void>;

}

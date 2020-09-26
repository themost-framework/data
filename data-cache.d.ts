// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {ConfigurationStrategy} from "@themost/common";

export declare class DataCache {
    init(callback: (err?: Error) => void): void;

    remove(key: string, callback: (err?: Error) => void): void;

    removeAll(callback: (err?: Error) => void): void;

    add(key: string, value: any, ttl?: number, callback?: (err?: Error) => void): void;

    ensure(key: string, getFunc: (err?: Error, res?: any) => void, callback?: (err?: Error) => void): void;

    get(key: string, callback?: (err?: Error, res?: any) => void): void;

    static getCurrent(): DataCache;
}


export declare abstract class DataCacheStrategy extends ConfigurationStrategy {

    abstract add(key: string, value: any, absoluteExpiration?: number): Promise<any>;

    abstract remove(key: string): Promise<any>;

    abstract clear(): Promise<any>;

    abstract get(key: string): Promise<any>;

    abstract getOrDefault(key: string, getFunc: Promise<any>, absoluteExpiration?: number): Promise<any>;

}


export declare class DefaultDataCacheStrategy extends DataCacheStrategy {

    add(key: string, value: any, absoluteExpiration?: number): Promise<any>;

    remove(key: string): Promise<any>;

    clear(): Promise<any>;

    get(key: string): Promise<any>;

    getOrDefault(key: string, getFunc: Promise<any>, absoluteExpiration?: number): Promise<any>;

}

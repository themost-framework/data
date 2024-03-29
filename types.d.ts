// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataModel} from "./data-model";
import {ConfigurationBase, SequentialEventEmitter, DataAdapterBase, DataAdapterMigration, DataContextBase, ContextUserBase} from "@themost/common";
import {DataAssociationMappingBase, DataFieldBase} from '@themost/common';

export declare function DataAdapterCallback(err?:Error, result?:any): void;

export declare class DataAdapter implements DataAdapterBase {
    /**
     *
     * @param options
     */
    constructor(options:any);
    openAsync(): Promise<void>;
    closeAsync(): Promise<void>;
    executeAsync(query: any, values: any): Promise<any>;
    selectIdentityAsync(entity: string, attribute: string): Promise<any>;
    executeInTransactionAsync(func: () => Promise<void>): Promise<void>;
    migrate(obj: DataAdapterMigration, callback: (err: Error, result?: any) => void): void;
    migrateAsync(obj: DataAdapterMigration): Promise<any>;
    /**
     *
     */
    rawConnection:any;
    /**
     *
     */
    options:any;

    /**
     *
     * @param {(err?: Error) => void} callback
     */
    open(callback:(err?:Error) => void): void;

    /**
     *
     * @param {(err?: Error) => void} callback
     */
    close(callback:(err?:Error) => void): void;

    /**
     *
     * @param query
     * @param {Array<any>} values
     * @param {(err?: Error, result?: any) => void} callback
     */
    execute(query:any, values:Array<any>, callback:(err?:Error, result?:any) => void): void;

    /**
     *
     * @param {string} entity
     * @param {string} attribute
     * @param {(err?: Error, result?: any) => void} callback
     */
    selectIdentity(entity:string, attribute:string , callback?:(err?:Error, result?:any) => void): void;

    /**
     *
     * @param {Function} fn
     * @param {(err?: Error) => void} callback
     */
    executeInTransaction(fn:Function, callback:(err?:Error) => void): void;

    /**
     *
     * @param {string} name
     * @param query
     * @param {(err?: Error) => void} callback
     */
    createView(name:string, query:any, callback:(err?:Error) => void): void;
}

export declare interface ContextUser extends ContextUserBase {
    
}

export declare class DataContext extends SequentialEventEmitter implements DataContextBase {
    
    user?: ContextUser;

    interactiveUser?: ContextUser;

    model(name:any): DataModel;

    db: DataAdapterBase;

    getConfiguration(): ConfigurationBase;

    finalize(callback?:(err?:Error) => void): void;

    finalizeAsync(): Promise<void>;

    executeInTransactionAsync(func: () => Promise<void>): Promise<void>;
}

export declare class DataContextEmitter {
    ensureContext:void;
}

export declare interface DataModelPrivilege {
    type: 'self' | 'global' | 'parent' | 'item';
    mask: number;
    account?: string;
    filter?: string;
    scope?: string[];
    [k: string]: unknown;
}

export declare class DataAssociationMapping implements DataAssociationMappingBase {
    constructor(obj?: any);
    associationAdapter?: string;
    parentModel?: string;
    childModel?: string;
    parentField?: string;
    childField?: string;
    refersTo?: string;
    associationObjectField?: string;
    associationValueField?: string;
    cascade?: 'delete' | 'none';
    associationType?: 'association' | 'junction';
    select?: Array<string>;
    privileges?: Array<DataModelPrivilege>;
    [k: string]: unknown;
}

export declare interface QueryPipelineLookup {
    from: string;
    localField?: string;
    foreignField?: string;
    let?: string;
    pipeline?: { $match: { $expr: any } }[],
    as?: string
}

export declare interface QueryPipelineProject {
    [name: string]: string | (1 | 0) | any;
}

export declare interface QueryPipelineStage {
    $lookup?: QueryPipelineLookup;
    $project?: QueryPipelineProject;
}

export declare class DataField implements DataFieldBase {
    name: string;
    property?: string;
    title?: string;
    nullable?: boolean;
    type?: string;
    primary?: boolean;
    many?: boolean;
    model?: string;
    value?: string;
    calculation?: string;
    readonly?: boolean;
    editable?: boolean;
    insertable?: boolean;
    mapping?: DataAssociationMapping;
    expandable?: boolean;
    nested?: boolean;
    description?: string;
    help?: string;
    validation?: any;
    virtual?: boolean;
    multiplicity?: 'ZeroOrOne' | 'Many' | 'One' | 'Unknown';
    indexed?: boolean;
    size?: number;
    query?: QueryPipelineStage[];
    [k: string]: unknown;
}

export declare class DataEventArgs {
    model: DataModel;
    target: any;
    state?: number;
    emitter?: any;
    query?: any;
    previous?: any;
    throwError?: boolean;
}

export declare interface BeforeSaveEventListener {
    beforeSave(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare interface AfterSaveEventListener {
    afterSave(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare interface BeforeRemoveEventListener {
    beforeRemove(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare interface AfterRemoveEventListener {
    afterRemove(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare interface BeforeUpgradeEventListener {
    beforeUpgrade(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare interface AfterUpgradeEventListener {
    afterUpgrade(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare interface BeforeExecuteEventListener {
    beforeExecute(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare interface AfterExecuteEventListener {
    afterExecute(event: DataEventArgs, callback: (err?: Error) => void): void;
}

export declare class TypeParser {
    static parseInteger(val: any): number;
    static parseCounter(val: any): number;
    static parseFloat(val: any): number;
    static parseNumber(val: any): number;
    static parseDateTime(val: any): Date;
    static parseDate(val: any): Date;
    static parseBoolean(val: any): boolean;
    static parseText(val: any): string;
    static hasParser(type: string): (value: any) => any;

}

declare interface PrivilegeTypeEnum {
    readonly Self: string;
    readonly Parent: string;
    readonly Item: string;
    readonly Global: string;
}

export declare const PrivilegeType: PrivilegeTypeEnum;

declare interface DataObjectStateEnum {
    readonly Insert: number;
    readonly Update: number;
    readonly Delete: number;
}

export declare const DataObjectState: DataObjectStateEnum;

declare interface DataCachingTypeEnum {
    readonly None: string;
    readonly Always: string;
    readonly Conditional: string;
}

export declare const DataCachingType: DataCachingTypeEnum;

export declare type parsers = TypeParser;

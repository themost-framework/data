// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {DataModel} from "./data-model";
import {ConfigurationBase, SequentialEventEmitter} from "@themost/common";

export declare function DataAdapterCallback(err?:Error, result?:any): void;

export declare class DataAdapter {
    /**
     *
     * @param options
     */
    constructor(options:any);
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

export declare class DataContext extends SequentialEventEmitter {
    /**
     *
     * @param {*} name
     * @returns {DataModel}
     */
    model(name:any):DataModel

    /**
     *
     */
    db:DataAdapter;

    /**
     *
     * @returns {ConfigurationBase}
     */
    getConfiguration():ConfigurationBase;

    /**
     *
     * @param {(err?: Error) => void} callback
     */
    finalize(callback?:(err?:Error) => void): void;
}

export declare class DataContextEmitter {
    ensureContext:void;
}

export declare interface DataModelPrivilege {
    type: string;
    mask: number;
    account?: string;
    filter?: string;
}

export declare class DataAssociationMapping {
    constructor(obj?: any);
    associationAdapter?: string;
    parentModel?: string;
    childModel?: string;
    parentField?: string;
    childField?: string;
    refersTo?: string;
    associationObjectField?: string;
    associationValueField?: string;
    cascade?: any;
    associationType?: string;
    select?: Array<string>;
    privileges?: Array<DataModelPrivilege>;
  
}

export declare class DataField {
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
    mapping?: DataAssociationMapping;
    expandable?: boolean;
    nested?: boolean;
    description?: string;
    help?: string;
    validation?: any;
    virtual?: boolean;
    multiplicity?: string;
    indexed?: boolean;
    size?: number;
    hidden?:boolean;
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

export declare interface TypeParser {
    parseInteger(val: any): number;
    parseCounter(val: any): number;
    parseFloat(val: any): number;
    parseNumber(val: any): number;
    parseDateTime(val: any): Date;
    parseDate(val: any): Date;
    parseBoolean(val: any): boolean;
    parseText(val: any): string;

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

export declare const parsers: TypeParser;

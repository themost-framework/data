// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataModel} from "./data-model";
import {
    ApplicationBase,
    ConfigurationBase,
    ContextUserBase,
    DataAdapterBase,
    SequentialEventEmitter
} from "@themost/common";
import {Observable} from 'rxjs';

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


/**
 * Holds user information of a data context
 */
export interface AuthenticatedUser {
    /**
     * Gets or sets a string which represents the name of the user
     */
    name: string;
    /**
     * Gets or sets a string which represents the current authentication type e.g. Basic, Bearer, None etc
     */
    authenticationType?: string;
    /**
     * Gets or sets a string which represents a token associated with this user
     */
    authenticationToken?: string;
    /**
     * Gets or sets a scope if current authentication type is associated with scopes like OAuth2 authentication
     */
    authenticationScope?: string;
    /**
     * Gets or sets a key returned by authentication provider and identifies this user e.g. The id of the user
     */
    authenticationProviderKey?: any;
}

/**
 * Holds user information when a data context is in unattended mode
 */
export interface InteractiveUser extends AuthenticatedUser{
}

export declare interface ContextUser extends ContextUserBase {

}

export declare abstract class DataContext extends SequentialEventEmitter {

    /**
     * Optional property representing the use of the current context.
     *
     * @type {ContextUser}
     */
    user?: ContextUser;

    /**
     * Optional property representing the interactive user of the current context.
     * The interactive user is the original user who initiated the current context.
     */
    interactiveUser?: ContextUser;

    /**
     * An observable stream that emits user-related data.
     *
     * @type {Observable<any>}
     */
    user$: Observable<any>;

    /**
     * An observable stream that emits interactive user-related data.
     *
     * @type {Observable}
     */
    interactiveUser$: Observable<any>;

    /**
     * An observable stream that emits anonymous user-related data.
     *
     * @type {Observable}
     */
    anonymousUser$: Observable<any>;

    /**
     * The database adapter instance used for interacting with the database.
     * This property provides the necessary methods and properties to perform
     * database operations such as querying, inserting, updating, and deleting records.
     */
    readonly db: DataAdapterBase;

    /**
     * Returns an instance of the data model with the specified name.
     * @param {*} name
     */
    abstract model(name:any): DataModel;

    /**
     * Returns the configuration service of the parent application.
     * @returns {ConfigurationBase}
     */
    abstract getConfiguration(): ConfigurationBase;

    /**
     * Finalizes the current context and releases all resources.
     * @param {(err?: Error) => void} callback
     */
    abstract finalize(callback?:(err?:Error) => void): void;

    /**
     * Finalizes the current context and releases all resources.
     * @returns {Promise<void>}
     */
    finalizeAsync(): Promise<void>;

    /**
     * Executes the specified function within a transaction.
     * A transaction is a set of operations that are executed as a single unit of work.
     * @param func
     */
    executeInTransactionAsync(func: () => Promise<void>): Promise<void>;

    /**
     * Switches the current user of the context.
     * @param {ContextUser} user
     */
    switchUser(user?: ContextUser): void;

    /**
     * An alternative method to switch the current user of the context.
     * @param {ContextUser} user
     */
    setUser(user?: ContextUser): void;

    /**
     * Switches the interactive user of the context. The interactive user is the original user who initiated the current context.
     * @param {ContextUser} user
     */
    switchInteractiveUser(user?: ContextUser): void;

    /**
     * An alternative method to switch the interactive user of the context.
     * @param {ContextUser} user
     */
    setInteractiveUser(user?: ContextUser): void;

    /**
     * Sets the application of the current context. The application is the parent application that created the current context.
     * @param {ApplicationBase} application
     */
    setApplication(application: ApplicationBase | any): void;

    /**
     * Returns the application of the current context.
     *
     */
    getApplication(): ApplicationBase;

    /**
     * Refreshes the state of the current context including the state of the current user and the interactive user.
     */
    protected refreshState(): void;
}

export declare class DataContextEmitter {
    ensureContext:void;
}

export declare interface DataModelPrivilege {
    type: string;
    mask: number;
    account?: string;
    when?: string;
    filter?: string;
    scope?: string[];
    exclude?: string;
}

export declare class DataAssociationMapping {
    constructor(obj: any);
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

export declare interface QueryPipelineLookup {
    from: string;
    localField?: string;
    foreignField?: string;
    let?: string;
    pipeline?: {
        $match: any;
    }
    as?: string
}

export declare interface QueryPipelineProject {
    [name: string]: string | (1 | 0) | any;
}

export declare interface QueryPipelineStage {
    $lookup?: QueryPipelineLookup;
    $project?: QueryPipelineProject;
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
    insertable? : boolean;
    additionalType?: string;
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
    query?: QueryPipelineStage[];
}

export declare class DataEventArgs {
    model: DataModel;
    target: any;
    state?: number;
    emitter?: any;
    query?: any;
    previous?: any;
    throwError?: boolean;
    result?: unknown;
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

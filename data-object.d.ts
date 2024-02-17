// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataQueryable} from "./data-queryable";
import {DataContext} from "./types";
import {DataModel} from "./data-model";
import {SequentialEventEmitter} from "@themost/common";

export declare class DataObject extends SequentialEventEmitter {
    context:DataContext;
    silent(value?:boolean):DataObject;
    selector(name:string, selector:Function):DataObject;
    is(selector:string):Promise<any>
    getType():string
    getId():any
    query(attr:string):DataQueryable;
    save(context?: DataContext, callback?:(err:Error) => void):Promise<any>|void;
    remove(context?: DataContext, callback?:(err:Error) => void):Promise<any>|void;
    getModel(): DataModel;
    getAdditionalModel():Promise<DataModel>;
    getAdditionalObject():Promise<DataObject|any>;
    attr(name: string, callback:(err?: Error,res?: any) => void): void;
    attr(name: string): any;
    property(name: string): any;
}

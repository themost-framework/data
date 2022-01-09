// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataQueryable} from "./data-queryable";
import {DataObject} from "./data-object";
import {DataAssociationMapping, DataField} from "./types";
import {DataModel} from "./data-model";

export declare class HasParentJunction extends DataQueryable {

    constructor(parent: any, mapping: DataAssociationMapping | string);
    parent: DataObject;
    mapping: DataAssociationMapping;
    readonly baseModel: DataModel;
    getBaseModel(): DataModel;
    getValueField(): string;
    getObjectField(): string;
    insert(object: any): Promise<any>;
    remove(object: any): Promise<any>;
    migrate(callback: (err?: Error) => void): void;
    migrateAsync(): Promise<void>;

}

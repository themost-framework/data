// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {DataQueryable} from "./data-queryable";
import {DataObject} from "./data-object";
import {DataAssociationMapping} from "./types";
import {DataModel} from "./data-model";

export declare class HasParentJunction extends DataQueryable {
    constructor(obj: DataObject | any, association: any);
    parent: DataObject;
    mapping: DataAssociationMapping;
    getBaseModel(): DataModel;
    getValueField(): string;
    getObjectField(): string;
    insert(obj: any): Promise<any>;
    remove(obj: any): Promise<any>;
    migrate(callback: (err?: Error) => void): void;
}

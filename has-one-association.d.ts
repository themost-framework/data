// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataQueryable} from "./data-queryable";
import {DataAssociationMapping} from "./types";
import {DataObject} from "./data-object";

export declare class HasOneAssociation extends DataQueryable {
    constructor(parent: any, association: DataAssociationMapping);
    parent: DataObject;
    mapping: DataAssociationMapping;
}

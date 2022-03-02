// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataQueryable} from "./data-queryable";
import {DataAssociationMapping} from "./types";
import {DataObject} from "./data-object";
import {DataModel} from "./data-model";

export declare class HasOneAssociation extends DataQueryable{
    constructor(parent: any, association: DataAssociationMapping);
    parent: DataObject;
    model: DataModel;
    mapping: DataAssociationMapping;
}

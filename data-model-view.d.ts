// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2022, THEMOST LP All rights reserved
import {DataModel} from "./data-model";
import {DataField} from "./types";

export declare class DataModelView {
    constructor(model:DataModel);
    model: DataModel;
    title?: string;
    name?: string;
    public?: boolean;
    sealed?: boolean;
    filter?: string;
    order?: string;
    group?: string;
    fields?: Array<DataField>;
    readonly attributes: Array<DataField>;

    cast(obj: any): any;

}
